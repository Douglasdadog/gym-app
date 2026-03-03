"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data as Profile);
      setLoading(false);
    };
    fetchProfile();
  }, [supabase]);

  if (loading || !profile) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass rounded-2xl p-6 col-span-2 md:col-span-1 min-h-[180px] flex items-center justify-center"
      >
        <div className="animate-pulse text-accent-cyan/60">Loading...</div>
      </motion.div>
    );
  }

  const config = tierConfig[profile.membership_tier] ?? tierConfig.Basic;
  const Icon = config.icon;

  return (
    <Link href="/membership">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass rounded-2xl p-6 col-span-2 md:col-span-1 glow-cyan transition-shadow duration-300 hover:border-accent-cyan/30 cursor-pointer"
      >
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
          {profile.membership_tier === "None" ? "No plan" : profile.membership_tier}
        </p>
      <ul className="mt-3 space-y-1 text-sm text-white/60">
        {config.perks.map((p) => (
          <li key={p}>• {p}</li>
        ))}
      </ul>
      {(profile.current_weight || profile.goal_weight) && (
          <div className="mt-4 pt-4 border-t border-white/10 text-xs text-white/50">
            {profile.current_weight && <span>Current: {profile.current_weight} kg</span>}
            {profile.goal_weight && <span className="ml-3">Goal: {profile.goal_weight} kg</span>}
          </div>
        )}
        <p className="mt-2 text-xs text-accent-cyan/70">Click to view tiers & upgrade</p>
      </motion.div>
    </Link>
  );
}
