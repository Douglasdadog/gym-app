"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Dumbbell, Crown, Sparkles, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MEMBERSHIP_TIERS } from "@/lib/tiers";
import type { Profile } from "@/types/database";

const TIERS_WITH_ICONS = [
  { ...MEMBERSHIP_TIERS[0], icon: null, highlight: false },
  { ...MEMBERSHIP_TIERS[1], icon: Sparkles, highlight: true },
  { ...MEMBERSHIP_TIERS[2], icon: Crown, highlight: false },
];

export default function MembershipPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth?redirect=/membership");
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data as Profile);
      setLoading(false);
    };
    fetch();
  }, [supabase, router]);

  useEffect(() => {
    const success = searchParams.get("success");
    const tier = searchParams.get("tier");
    if (success === "1" && tier) {
      setMessage(`Payment successful! Your ${tier} membership is active. Welcome!`);
      setProfile((p) => (p ? { ...p, membership_tier: tier as Profile["membership_tier"] } : null));
      window.history.replaceState({}, "", "/membership");
    }
  }, [searchParams]);

  const purchase = async (tierId: string) => {
    if (!profile) return;
    setPurchasing(tierId);
    setMessage("");
    try {
      const res = await fetch("/api/payment/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tier: tierId }),
      });
      const data = await res.json();

      if (res.status === 503 && data.error?.includes("not configured")) {
        await purchaseDirect(tierId);
        return;
      }

      if (res.status === 503) {
        setMessage(data.error || "Payment gateway unavailable.");
        return;
      }

      if (!res.ok) throw new Error(data.error || "Could not start checkout");
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      throw new Error("No checkout URL");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start payment";
      setMessage(msg);
    } finally {
      setPurchasing(null);
    }
  };

  const purchaseDirect = async (tierId: string) => {
    if (!profile) return;
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ membership_tier: tierId })
        .eq("id", profile.id);
      if (profileError) throw profileError;

      const tierConfig = MEMBERSHIP_TIERS.find((t) => t.id === tierId);
      const price = tierConfig?.price ?? 0;
      const { error: membershipError } = await supabase.from("memberships").insert({
        user_id: profile.id,
        type: tierId,
        price,
        perks: tierConfig?.perks ?? [],
        status: "active",
      });
      if (membershipError) throw membershipError;

      setProfile((p) => (p ? { ...p, membership_tier: tierId as Profile["membership_tier"] } : null));
      setMessage(`Successfully upgraded to ${tierId}! Your dashboard will update shortly.`);
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Failed to purchase";
      setMessage(msg);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="animate-pulse text-accent-cyan">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000]">
      <header className="border-b border-white/10 sticky top-0 z-50 glass">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Dumbbell className="w-8 h-8 text-accent-lime" />
            <span className="font-bold text-xl tracking-tight">CYBER-GYM</span>
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/dashboard" className="text-white/60 hover:text-white">Dashboard</Link>
            <Link href="/bookings" className="text-white/60 hover:text-white">Bookings</Link>
            <Link href="/membership" className="text-accent-lime font-medium">Membership</Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/");
                router.refresh();
              }}
              className="text-white/60 hover:text-white"
            >
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-bold mb-2"
        >
          Membership Tiers
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white/60 mb-8"
        >
          {profile?.membership_tier && profile.membership_tier !== "None"
            ? `Your current plan: ${profile.membership_tier}. Upgrade or change below.`
            : "Choose a plan to get started."}
        </motion.p>

        {message && (
          <p className={`mb-6 text-sm ${message.includes("Success") ? "text-accent-lime" : "text-red-400"}`}>
            {message}
          </p>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {TIERS_WITH_ICONS.map((tier) => {
            const Icon = tier.icon;
            const isCurrent = profile?.membership_tier === tier.id;
            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass rounded-2xl p-8 ${tier.highlight ? "ring-2 ring-accent-lime" : ""}`}
              >
                {Icon && <Icon className="w-10 h-10 text-accent-cyan mb-4" />}
                <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
                <p className="text-accent-lime font-semibold mb-2">{tier.priceLabel}/mo</p>
                <p className="text-sm text-white/60 mb-6">{tier.desc}</p>
                <ul className="space-y-3 text-sm text-white/70 mb-8">
                  {tier.perks.map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-accent-cyan shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => purchase(tier.id)}
                  disabled={isCurrent || purchasing !== null}
                  className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                    isCurrent
                      ? "bg-white/10 text-white/50 cursor-default"
                      : "bg-accent-lime text-black hover:bg-accent-lime/90 disabled:opacity-50"
                  }`}
                >
                  {isCurrent ? "Current Plan" : purchasing === tier.id ? "Processing..." : `Get ${tier.name}`}
                </button>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
