"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Dumbbell, LayoutDashboard, Calendar, Utensils, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { OccupancyGauge } from "@/components/dashboard/OccupancyGauge";
import { NextPTSession } from "@/components/dashboard/NextPTSession";
import { DailyMacros } from "@/components/dashboard/DailyMacros";
import { MembershipStatus } from "@/components/dashboard/MembershipStatus";
import { NutritionCoach } from "@/components/dashboard/NutritionCoach";
import { BookingCard } from "@/components/dashboard/BookingCard";
import { SupportChat } from "@/components/SupportChat";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [macrosRefresh, setMacrosRefresh] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/auth?redirect=/dashboard");
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setIsAdmin(profile?.role === "admin");
      } catch {
        router.replace("/auth?redirect=/dashboard");
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000]">
        <header className="border-b border-white/10 sticky top-0 z-50 glass">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 opacity-80">
              <Dumbbell className="w-8 h-8 text-accent-lime" />
              <span className="font-bold text-xl tracking-tight">CYBER-GYM</span>
            </Link>
            <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="h-9 w-48 bg-white/10 rounded mb-8 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass rounded-2xl p-6 min-h-[180px] animate-pulse">
                <div className="h-5 w-24 bg-white/10 rounded mb-4" />
                <div className="h-12 w-full bg-white/10 rounded" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000]">
      <header className="border-b border-white/10 sticky top-0 z-50 glass">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Dumbbell className="w-8 h-8 text-accent-lime" />
            <span className="font-bold text-xl tracking-tight">CYBER-GYM</span>
          </Link>
          <nav className="flex gap-4 text-sm items-center">
            <Link href="/dashboard" className="text-accent-lime font-medium flex items-center gap-1">
              <LayoutDashboard className="w-4 h-4" /> My Fitness
            </Link>
            <Link href="/bookings" className="text-white/60 hover:text-white flex items-center gap-1">
              <Calendar className="w-4 h-4" /> Bookings
            </Link>
            <Link href="/meal-logs" className="text-white/60 hover:text-white flex items-center gap-1">
              <Utensils className="w-4 h-4" /> Meal Logs
            </Link>
            {isAdmin && (
              <Link href="/admin" className="text-accent-cyan hover:text-accent-cyan/80 flex items-center gap-1">
                <Shield className="w-4 h-4" /> Admin
              </Link>
            )}
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/");
                router.refresh();
              }}
              className="text-white/60 hover:text-white"
            >
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8 animate-fade-in">
          Member Dashboard
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-auto">
          <OccupancyGauge />
          <NextPTSession />
          <DailyMacros refreshTrigger={macrosRefresh} />
          <MembershipStatus />
          <NutritionCoach onLogAdded={() => setMacrosRefresh((n) => n + 1)} />
          <BookingCard />
        </div>
      </main>

      <SupportChat />
    </div>
  );
}
