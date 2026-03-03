import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();

    // Member growth: new members per month (last 6 months)
    const memberGrowth: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d.toISOString().split("T")[0];
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
      const { count } = await supabase
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .gte("created_at", start)
        .lte("created_at", end + "T23:59:59");
      memberGrowth.push({
        month: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        count: count ?? 0,
      });
    }

    // Foot traffic: check-ins per day (last 7 days)
    const footTraffic: { day: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split("T")[0];
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextStr = nextDay.toISOString().split("T")[0];
      const { count } = await supabase
        .from("gym_check_ins")
        .select("*", { count: "exact", head: true })
        .gte("checked_in_at", dayStr)
        .lt("checked_in_at", nextStr);
      footTraffic.push({
        day: d.toLocaleDateString("en-US", { weekday: "short" }),
        count: count ?? 0,
      });
    }

    return NextResponse.json({ memberGrowth, footTraffic });
  } catch (err) {
    console.error("Analytics error:", err);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
