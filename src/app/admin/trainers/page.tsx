"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Home, Dumbbell, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Trainer } from "@/types/database";

interface BookingWithTrainer {
  id: string;
  date: string;
  time_slot: string;
  location_type: string;
  status: string;
  trainer: Trainer;
}

interface TrainerPayout {
  trainer: Trainer;
  completedSessions: number;
  gymSessions: number;
  homeSessions: number;
  estimatedEarnings: number;
}

export default function AdminTrainersPage() {
  const [todayBookings, setTodayBookings] = useState<BookingWithTrainer[]>([]);
  const [trainerPayouts, setTrainerPayouts] = useState<TrainerPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetch = async () => {
      const today = new Date().toISOString().split("T")[0];

      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, date, time_slot, location_type, status, trainer_id")
        .eq("date", today)
        .in("status", ["pending", "confirmed", "completed"])
        .order("time_slot");

      const { data: trainers } = await supabase.from("trainers").select("*");
      const trainerMap = new Map((trainers ?? []).map((t: Trainer) => [t.id, t]));

      const withTrainers: BookingWithTrainer[] = (bookings ?? []).map((b: { trainer_id: string } & Record<string, unknown>) => ({
        ...b,
        trainer: trainerMap.get(b.trainer_id)!,
      })).filter((b: BookingWithTrainer) => b.trainer);

      setTodayBookings(withTrainers);

      // Payout calculation: completed sessions * rate
      const { data: completed } = await supabase
        .from("bookings")
        .select("trainer_id, location_type")
        .eq("status", "completed");

      const payoutMap = new Map<string, { gym: number; home: number }>();
      (completed ?? []).forEach((b: { trainer_id: string; location_type: string }) => {
        const t = trainerMap.get(b.trainer_id);
        if (!t) return;
        const cur = payoutMap.get(b.trainer_id) ?? { gym: 0, home: 0 };
        if (b.location_type === "Gym") {
          cur.gym++;
          payoutMap.set(b.trainer_id, cur);
        } else {
          cur.home++;
          payoutMap.set(b.trainer_id, cur);
        }
      });

      const payouts: TrainerPayout[] = (trainers ?? []).map((t: Trainer) => {
        const counts = payoutMap.get(t.id) ?? { gym: 0, home: 0 };
        const earnings = counts.gym * t.hourly_rate_gym + counts.home * t.hourly_rate_home;
        return {
          trainer: t,
          completedSessions: counts.gym + counts.home,
          gymSessions: counts.gym,
          homeSessions: counts.home,
          estimatedEarnings: earnings,
        };
      }).filter((p: TrainerPayout) => p.completedSessions > 0);

      setTrainerPayouts(payouts);
      setLoading(false);
    };
    fetch();

    const channel = supabase
      .channel("admin_bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        fetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-accent-lime">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl sm:text-3xl font-bold"
      >
        Trainer Payouts & Sessions
      </motion.h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Sessions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/10"
        >
          <h3 className="font-semibold text-sm uppercase tracking-wider text-accent-lime/90 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Today&apos;s Sessions (Gym & Home)
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto trainer-scroll">
            {todayBookings.length === 0 ? (
              <p className="text-white/50 text-sm">No sessions today.</p>
            ) : (
              todayBookings.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                >
                  <div>
                    <p className="font-medium">{b.trainer?.name}</p>
                    <p className="text-xs text-white/50">
                      {b.time_slot} • {b.location_type === "Gym" ? (
                        <span className="inline-flex items-center gap-1"><Dumbbell className="w-3 h-3" /> Gym</span>
                      ) : (
                        <span className="inline-flex items-center gap-1"><Home className="w-3 h-3" /> Home</span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-lg ${
                      b.status === "completed"
                        ? "bg-green-500/20 text-green-400"
                        : b.status === "confirmed"
                        ? "bg-accent-lime/20 text-accent-lime"
                        : "bg-white/10 text-white/70"
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Trainer Payouts */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/10"
        >
          <h3 className="font-semibold text-sm uppercase tracking-wider text-accent-lime/90 mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Trainer Payout Estimates (Completed Sessions)
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto trainer-scroll">
            {trainerPayouts.length === 0 ? (
              <p className="text-white/50 text-sm">No completed sessions yet.</p>
            ) : (
              trainerPayouts.map((p) => (
                <div
                  key={p.trainer.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5"
                >
                  <div>
                    <p className="font-medium">{p.trainer.name}</p>
                    <p className="text-xs text-white/50">
                      {p.gymSessions} gym (₱{p.trainer.hourly_rate_gym}/hr) • {p.homeSessions} home (₱{p.trainer.hourly_rate_home}/hr)
                    </p>
                  </div>
                  <p className="font-bold text-accent-lime">₱{p.estimatedEarnings.toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
