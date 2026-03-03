"use client";

import { Calendar } from "lucide-react";
import Link from "next/link";

export function BookingCard() {
  return (
    <div className="glass rounded-2xl p-6 col-span-2 glow-cyan transition-shadow duration-300 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-accent-cyan" />
          <h3 className="font-semibold text-sm uppercase tracking-wider text-accent-cyan/90">
            Book PT Session
          </h3>
        </div>
        <Link
          href="/bookings"
          className="text-xs text-accent-cyan hover:underline"
        >
          View →
        </Link>
      </div>
      <p className="text-sm text-white/60 mb-4">
        Gym or Home-based sessions. Home PT includes travel fee.
      </p>
      <Link
        href="/bookings"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/30 transition-colors text-sm font-medium"
      >
        Book Trainer
      </Link>
    </div>
  );
}
