"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, LogIn, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { GymStatus } from "@/types/database";

export function OccupancyGauge() {
  const [status, setStatus] = useState<GymStatus | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchCheckInStatus = async () => {
    const res = await fetch("/api/gym/status");
    const data = await res.json();
    setIsCheckedIn(data.isCheckedIn ?? false);
  };

  useEffect(() => {
    const fetchStatus = async () => {
      const { data } = await supabase.from("gym_status").select("*").single();
      setStatus(data);
      setLoading(false);
    };
    fetchStatus();
    fetchCheckInStatus();

    const channel = supabase
      .channel("gym_status")
      .on("postgres_changes", { event: "*", schema: "public", table: "gym_status" }, (payload) => {
        setStatus(payload.new as GymStatus);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const checkIn = async () => {
    setError(null);
    const res = await fetch("/api/gym/check-in", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to check in");
      return;
    }
    setIsCheckedIn(true);
    setStatus((s) => s ? { ...s, current_occupancy: data.current_occupancy } : null);
  };

  const checkOut = async () => {
    setError(null);
    const res = await fetch("/api/gym/check-out", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to check out");
      return;
    }
    setIsCheckedIn(false);
    setStatus((s) => s ? { ...s, current_occupancy: data.current_occupancy } : null);
  };

  if (loading || !status) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 col-span-2 md:col-span-1 min-h-[200px] flex items-center justify-center"
      >
        <div className="animate-pulse text-accent-cyan/60">Loading...</div>
      </motion.div>
    );
  }

  const pct = Math.round((status.current_occupancy / status.max_capacity) * 100);
  const color = pct >= 80 ? "#ef4444" : pct >= 50 ? "#CCFF00" : "#00FFFF";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass rounded-2xl p-6 col-span-2 md:col-span-1 glow-lime transition-shadow duration-300"
    >
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-accent-lime" />
        <h3 className="font-semibold text-sm uppercase tracking-wider text-accent-lime/90">
          Live Occupancy
        </h3>
      </div>
      <div className="relative h-24 flex items-center justify-center">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#1a1a1a" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 283} 283`}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>{status.current_occupancy}</span>
          <span className="text-xs text-white/50">/ {status.max_capacity}</span>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button
          onClick={checkIn}
          disabled={isCheckedIn}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            isCheckedIn ? "bg-white/5 text-white/40 cursor-not-allowed" : "bg-accent-lime/20 text-accent-lime hover:bg-accent-lime/30"
          }`}
        >
          <LogIn className="w-4 h-4" /> Check In
        </button>
        <button
          onClick={checkOut}
          disabled={!isCheckedIn}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            !isCheckedIn ? "bg-white/5 text-white/40 cursor-not-allowed" : "bg-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/30"
          }`}
        >
          <LogOut className="w-4 h-4" /> Check Out
        </button>
      </div>
    </motion.div>
  );
}
