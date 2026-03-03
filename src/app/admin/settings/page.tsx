"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, RotateCcw, Loader2 } from "lucide-react";

export default function AdminSettingsPage() {
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleResetGym = async () => {
    if (resetting) return;
    if (!confirm("Reset all check-ins and set occupancy to 0? This will sign everyone out of the gym.")) return;
    setResetting(true);
    setResetMessage(null);
    try {
      const res = await fetch("/api/admin/reset-gym", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setResetMessage("Gym reset successfully. All accounts synced to zero.");
      } else {
        setResetMessage(data.error || "Failed to reset");
      }
    } catch {
      setResetMessage("Request failed");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-8">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl sm:text-3xl font-bold"
      >
        Settings
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/10"
      >
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="w-5 h-5 text-accent-lime" />
          <h3 className="font-semibold text-sm uppercase tracking-wider text-accent-lime/90">
            Admin Configuration
          </h3>
        </div>
        <p className="text-white/70 text-sm mb-6">
          Admin settings placeholder. Configure gym capacity, business hours, notification preferences, and more.
        </p>

        <div className="pt-6 border-t border-white/10">
          <h4 className="font-medium text-sm text-white/90 mb-2">Gym Occupancy</h4>
          <p className="text-sm text-white/60 mb-4">
            Reset all check-ins and set live occupancy to zero. Use this to fix sync issues or start fresh.
          </p>
          <button
            onClick={handleResetGym}
            disabled={resetting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 disabled:opacity-50 transition-colors"
          >
            {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Reset Gym to Zero
          </button>
          {resetMessage && (
            <p className={`mt-3 text-sm ${resetMessage.includes("success") ? "text-accent-lime" : "text-red-400"}`}>
              {resetMessage}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
