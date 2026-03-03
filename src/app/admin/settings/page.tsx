"use client";

import { motion } from "framer-motion";
import { Settings as SettingsIcon } from "lucide-react";

export default function AdminSettingsPage() {
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
        <p className="text-white/70 text-sm">
          Admin settings placeholder. Configure gym capacity, business hours, notification preferences, and more.
        </p>
      </motion.div>
    </div>
  );
}
