"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Beef, Wheat, Droplets, RotateCcw, Undo2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { NutritionLog } from "@/types/database";

const PH_TZ = "Asia/Manila";

/** Get today's date range in PH time (resets at 00:00 PH) */
function getTodayPHRange() {
  const phDateStr = new Date().toLocaleDateString("en-CA", { timeZone: PH_TZ });
  return {
    start: `${phDateStr}T00:00:00+08:00`,
    end: `${phDateStr}T23:59:59.999+08:00`,
  };
}

export function DailyMacros({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const fetchLogs = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { start, end } = getTodayPHRange();
      const { data } = await supabase
        .from("nutrition_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false });

      setLogs((data as NutritionLog[]) ?? []);
      setLoading(false);
    };
    fetchLogs();
  }, [supabase, refreshTrigger]);

  const handleReset = async () => {
    if (logs.length === 0 || actionLoading) return;
    setActionLoading(true);
    const ids = logs.map((l) => l.id);
    const { error } = await supabase.from("nutrition_logs").delete().in("id", ids);
    setActionLoading(false);
    if (!error) setLogs([]);
  };

  const handleUndo = async () => {
    if (logs.length === 0 || actionLoading) return;
    const last = logs[0];
    setActionLoading(true);
    const { error } = await supabase.from("nutrition_logs").delete().eq("id", last.id);
    setActionLoading(false);
    if (!error) setLogs((prev) => prev.slice(1));
  };

  const totals = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + log.protein,
      carbs: acc.carbs + log.carbs,
      fats: acc.fats + log.fats,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 }
  );

  const macros = [
    { label: "Calories", value: totals.calories, icon: Flame, color: "text-orange-400" },
    { label: "Protein", value: Math.round(totals.protein), icon: Beef, color: "text-accent-lime" },
    { label: "Carbs", value: Math.round(totals.carbs), icon: Wheat, color: "text-amber-400" },
    { label: "Fats", value: Math.round(totals.fats), icon: Droplets, color: "text-accent-cyan" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass rounded-2xl p-6 col-span-2 glow-lime transition-shadow duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-accent-lime" />
          <h3 className="font-semibold text-sm uppercase tracking-wider text-accent-lime/90">
            Daily Macros
          </h3>
        </div>
        <span className="text-xs text-white/40">Resets 00:00 PH</span>
      </div>
      {loading ? (
        <div className="animate-pulse text-accent-cyan/60">Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {macros.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex flex-col gap-1">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-2xl font-bold">{value}</span>
                <span className="text-xs text-white/50">{label}</span>
              </div>
            ))}
          </div>
          {(logs.length > 0) && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleUndo}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-accent-cyan border border-white/10 disabled:opacity-50 transition-colors"
                title="Remove last entry"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Undo
              </button>
              <button
                onClick={handleReset}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-red-400/90 border border-white/10 disabled:opacity-50 transition-colors"
                title="Clear all entries for today"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
