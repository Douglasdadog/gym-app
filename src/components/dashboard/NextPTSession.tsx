"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import type { Booking } from "@/types/database";

export function NextPTSession() {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [trainerName, setTrainerName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const supabase = createClient();

  const fetchNext = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const today = new Date().toISOString().split("T")[0];
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["pending", "confirmed"])
      .gte("date", today)
      .order("date", { ascending: true })
      .order("time_slot", { ascending: true })
      .limit(1);

    const next = bookings?.[0] as Booking | undefined;
    if (next) {
      setBooking(next);
      const { data: trainer } = await supabase.from("trainers").select("name").eq("id", next.trainer_id).single();
      setTrainerName(trainer?.name ?? "Trainer");
    } else {
      setBooking(null);
      setTrainerName("");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNext();
  }, [supabase]);

  const handleCancel = async () => {
    if (!booking || cancelling) return;
    setCancelling(true);
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
    setCancelling(false);
    if (!error) {
      setBooking(null);
      setTrainerName("");
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-6 col-span-2 md:col-span-1 min-h-[180px] flex items-center justify-center"
      >
        <div className="animate-pulse text-accent-cyan/60">Loading...</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass rounded-2xl p-6 col-span-2 md:col-span-1 glow-cyan transition-shadow duration-300"
    >
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-accent-cyan" />
        <h3 className="font-semibold text-sm uppercase tracking-wider text-accent-cyan/90">
          Next PT Session
        </h3>
      </div>
      {booking ? (
        <div className="space-y-3">
          <p className="text-lg font-semibold">{trainerName}</p>
          <p className="text-sm text-white/70">
            {format(new Date(booking.date), "EEE, MMM d")} · {booking.time_slot}
          </p>
          <div className="flex items-center gap-2 text-xs text-accent-cyan/80">
            <MapPin className="w-3.5 h-3.5" />
            {booking.location_type === "Home" ? booking.address || "Home" : "Gym"}
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="inline-block px-2 py-0.5 rounded text-xs bg-accent-cyan/20 text-accent-cyan">
              {booking.status}
            </span>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 disabled:opacity-50 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-white/50 text-sm">No upcoming sessions. Book one!</p>
      )}
    </motion.div>
  );
}
