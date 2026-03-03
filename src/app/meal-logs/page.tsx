"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Dumbbell, Utensils, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import type { NutritionLog } from "@/types/database";

export default function MealLogsPage() {
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth?redirect=/meal-logs");
        return;
      }
      const { data } = await supabase
        .from("nutrition_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setLogs((data as NutritionLog[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, [supabase, router]);

  return (
    <div className="min-h-screen bg-[#000000]">
      <header className="border-b border-white/10 sticky top-0 z-50 glass">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Dumbbell className="w-8 h-8 text-accent-lime" />
            <span className="font-bold text-xl tracking-tight">CYBER-GYM</span>
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/dashboard" className="text-white/60 hover:text-white">My Fitness</Link>
            <Link href="/bookings" className="text-white/60 hover:text-white">Bookings</Link>
            <Link href="/meal-logs" className="text-accent-lime font-medium">Meal Logs</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-bold mb-8 flex items-center gap-2"
        >
          <Utensils className="w-8 h-8 text-accent-lime" />
          Meal Logs
        </motion.h1>

        {loading ? (
          <div className="animate-pulse text-accent-cyan">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center text-white/50">
            <p>No meal logs yet. Add meals from the Dashboard AI Nutrition Coach.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <p className="font-medium">{log.meal_description}</p>
                  <p className="text-xs text-white/50">
                    {format(new Date(log.created_at), "MMM d, yyyy • h:mm a")}
                  </p>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-orange-400">{log.calories} cal</span>
                  <span className="text-accent-lime">P: {Math.round(log.protein)}g</span>
                  <span className="text-amber-400">C: {Math.round(log.carbs)}g</span>
                  <span className="text-accent-cyan">F: {Math.round(log.fats)}g</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
