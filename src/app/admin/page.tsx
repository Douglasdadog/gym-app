"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  CalendarCheck,
  AlertTriangle,
  DollarSign,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import type { GymStatus } from "@/types/database";

interface ChartData {
  month?: string;
  day?: string;
  count: number;
}

export default function AdminOverviewPage() {
  const [kpis, setKpis] = useState({
    totalRevenue: 0,
    activeMemberships: 0,
    todayBookings: 0,
    churnRate: 0,
  });
  const [occupancy, setOccupancy] = useState<GymStatus | null>(null);
  const [memberGrowth, setMemberGrowth] = useState<ChartData[]>([]);
  const [footTraffic, setFootTraffic] = useState<ChartData[]>([]);
  const [grokInsights, setGrokInsights] = useState<{
    revenue_forecast: string;
    peak_hour_trends: string;
    at_risk_summary: string;
  } | null>(null);
  const [grokLoading, setGrokLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const loadData = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];

        const { data: memberships } = await supabase
          .from("memberships")
          .select("price, status");
        const activeMemberships = memberships?.filter((m: { status: string }) => m.status === "active") ?? [];
        const totalRevenue = activeMemberships.reduce((s: number, m: { price?: number }) => s + (m.price ?? 0), 0);

        const { count } = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("date", today)
          .in("status", ["pending", "confirmed"]);

        const { data: allMembers } = await supabase
          .from("memberships")
          .select("status");
        const total = allMembers?.length ?? 0;
        const cancelled = allMembers?.filter((m: { status: string }) => m.status === "cancelled").length ?? 0;
        const churnRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;

        setKpis({
          totalRevenue,
          activeMemberships: activeMemberships.length,
          todayBookings: count ?? 0,
          churnRate,
        });

        const { data: status } = await supabase.from("gym_status").select("*").single();
        setOccupancy(status as GymStatus);

        const res = await fetchWithTimeout("/api/admin/analytics");
        if (res.ok) {
          const { memberGrowth: mg, footTraffic: ft } = await res.json();
          setMemberGrowth(mg ?? []);
          setFootTraffic(ft ?? []);
        }
      } catch {
        // keep existing state on error
      } finally {
        setLoading(false);
      }
    };
    loadData();

    const channel = supabase
      .channel("admin_gym_status")
      .on("postgres_changes", { event: "*", schema: "public", table: "gym_status" }, (payload: { new: GymStatus }) => {
        setOccupancy(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const KPI_CARDS = [
    {
      label: "Total Revenue (PHP)",
      value: `₱${kpis.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      delay: 0.1,
    },
    {
      label: "Active Memberships",
      value: kpis.activeMemberships,
      icon: Users,
      delay: 0.2,
    },
    {
      label: "Today's PT Bookings",
      value: kpis.todayBookings,
      icon: CalendarCheck,
      delay: 0.3,
    },
    {
      label: "Churn Rate",
      value: `${kpis.churnRate}%`,
      icon: AlertTriangle,
      delay: 0.4,
    },
  ];

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
        className="text-2xl sm:text-3xl font-bold mb-8"
      >
        Business Overview
      </motion.h1>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Live Occupancy - full width on mobile, 1 col on desktop */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="lg:col-span-1"
        >
          <div className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/10 h-full">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-accent-lime" />
              <h3 className="font-semibold text-sm uppercase tracking-wider text-accent-lime/90">
                Live Occupancy
              </h3>
            </div>
            {occupancy && (
              <div className="relative h-24 flex items-center justify-center">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#1a1a1a" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="#CCFF00"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${Math.min(100, (occupancy.current_occupancy / occupancy.max_capacity) * 100) / 100 * 283} 283`}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-accent-lime">{occupancy.current_occupancy}</span>
                  <span className="text-xs text-white/50">/ {occupancy.max_capacity}</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {KPI_CARDS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: kpi.delay }}
              className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/10 hover:border-accent-lime/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-5 h-5 text-accent-lime" />
                <span className="text-xs uppercase tracking-wider text-white/50">{kpi.label}</span>
              </div>
              <p className="text-2xl font-bold text-accent-lime">{kpi.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Member Growth & Foot Traffic Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/10"
        >
          <h3 className="font-semibold text-sm uppercase tracking-wider text-accent-lime/90 mb-4">
            Member Growth (Monthly)
          </h3>
          <div className="h-48">
            {memberGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="month" stroke="#888" fontSize={11} />
                  <YAxis stroke="#888" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                    labelStyle={{ color: "#CCFF00" }}
                  />
                  <Bar dataKey="count" fill="#CCFF00" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-white/40 text-sm">No data yet</div>
            )}
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/10"
        >
          <h3 className="font-semibold text-sm uppercase tracking-wider text-accent-lime/90 mb-4">
            Weekly Foot Traffic
          </h3>
          <div className="h-48">
            {footTraffic.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={footTraffic}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#CCFF00" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#CCFF00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="day" stroke="#888" fontSize={11} />
                  <YAxis stroke="#888" fontSize={11} />
                  <Tooltip
                    contentStyle={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                    labelStyle={{ color: "#CCFF00" }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#CCFF00" fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-white/40 text-sm">No data yet</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Grok AI Business Analyst */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/10"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-accent-lime/90 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Grok AI Business Analyst
          </h3>
          <button
            onClick={async () => {
              setGrokLoading(true);
              setGrokInsights(null);
              try {
                const res = await fetchWithTimeout("/api/admin/grok-insights", { method: "POST", credentials: "include", timeoutMs: 15000 });
                const data = await res.json();
                if (res.ok) setGrokInsights(data);
                else alert(data.error || "Failed to generate insights");
              } catch {
                alert("Request failed");
              } finally {
                setGrokLoading(false);
              }
            }}
            disabled={grokLoading}
            className="px-4 py-2 rounded-xl bg-accent-lime/20 text-accent-lime hover:bg-accent-lime/30 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {grokLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Insights
              </>
            )}
          </button>
        </div>
        {grokInsights ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <p className="text-xs uppercase tracking-wider text-accent-lime/70 mb-2">1. Revenue Forecast</p>
              <p className="text-sm text-white/90">{grokInsights.revenue_forecast}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <p className="text-xs uppercase tracking-wider text-accent-lime/70 mb-2">2. Peak Hour Trends</p>
              <p className="text-sm text-white/90">{grokInsights.peak_hour_trends}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5">
              <p className="text-xs uppercase tracking-wider text-accent-lime/70 mb-2">3. At-Risk Members (10+ days no check-in)</p>
              <p className="text-sm text-white/90">{grokInsights.at_risk_summary}</p>
            </div>
          </div>
        ) : (
          <p className="text-white/50 text-sm">Click &quot;Generate Insights&quot; to analyze your gym data with Grok AI.</p>
        )}
      </motion.div>
    </div>
  );
}
