"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crown, Sparkles, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

const tierConfig = {
  None: { color: "text-white/50", perks: ["No membership yet"], icon: null },
  Basic: { color: "text-white/70", perks: ["Gym access"], icon: null },
  Elite: { color: "text-accent-cyan", perks: ["Gym", "Sauna", "Group Classes"], icon: Sparkles },
  VIP: { color: "text-accent-lime", perks: ["All-access", "Home PT priority", "Unlimited AI Coaching"], icon: Crown },
};

export function MembershipStatus() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        if (error) {
          console.error("MembershipStatus fetch error:", error);
          setProfile({ id: user.id, email: user.email ?? "", full_name: null, membership_tier: "None", current_weight: null, goal_weight: null, created_at: "", updated_at: "" } as Profile);
        } else if (data) {
          setProfile(data as Profile);
        } else {
          setProfile({ id: user.id, email: user.email ?? "", full_name: null, membership_tier: "None", current_weight: null, goal_weight: null, created_at: "", updated_at: "" } as Profile);
        }
      } catch (e) {
        console.error("MembershipStatus error:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6 col-span-2 md:col-span-1 min-h-[180px] flex items-center justify-center animate-fade-in">
        <div className="animate-pulse text-accent-cyan/60">Loading...</div>
      </div>
    );
  }

  const displayProfile = profile ?? { id: "", email: "", full_name: null, membership_tier: "None" as const, current_weight: null, goal_weight: null, created_at: "", updated_at: "" };
  const config = tierConfig[displayProfile.membership_tier ?? "None"] ?? tierConfig.None;
  const Icon = config.icon;

  return (
    <Link href="/membership">
      <div className="glass rounded-2xl p-6 col-span-2 md:col-span-1 glow-cyan transition-shadow duration-300 hover:border-accent-cyan/30 cursor-pointer animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-accent-cyan" />}
            <h3 className="font-semibold text-sm uppercase tracking-wider text-accent-cyan/90">
              Membership
            </h3>
          </div>
          <ChevronRight className="w-4 h-4 text-white/40" />
        </div>
        <p className={`text-xl font-bold ${config.color}`}>
          {displayProfile.membership_tier === "None" ? "No plan" : displayProfile.membership_tier}
        </p>
      <ul className="mt-3 space-y-1 text-sm text-white/60">
        {config.perks.map((p) => (
          <li key={p}>• {p}</li>
        ))}
      </ul>
      {(displayProfile.current_weight || displayProfile.goal_weight) && (
          <div className="mt-4 pt-4 border-t border-white/10 text-xs text-white/50">
            {displayProfile.current_weight && <span>Current: {displayProfile.current_weight} kg</span>}
            {displayProfile.goal_weight && <span className="ml-3">Goal: {displayProfile.goal_weight} kg</span>}
          </div>
        )}
        <p className="mt-2 text-xs text-accent-cyan/70">Click to view tiers & upgrade</p>
      </div>
    </Link>
  );
}
