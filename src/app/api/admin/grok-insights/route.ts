import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { groqChatWithRotation, grokChatWithRotation } from "@/lib/grok/rotator";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const today = new Date().toISOString().split("T")[0];
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    const [
      { data: memberships },
      { data: bookings },
      { data: checkIns },
      { data: gymStatus },
    ] = await Promise.all([
      supabaseAdmin.from("memberships").select("price, status, created_at").order("created_at", { ascending: false }),
      supabaseAdmin.from("bookings").select("date, time_slot, status").gte("date", tenDaysAgo.toISOString().split("T")[0]),
      supabaseAdmin.from("gym_check_ins").select("user_id, checked_in_at"),
      supabaseAdmin.from("gym_status").select("current_occupancy, max_capacity").single(),
    ]);

    const activeMembers = memberships?.filter((m) => m.status === "active").length ?? 0;
    const totalRevenue = memberships?.filter((m) => m.status === "active").reduce((s, m) => s + (m.price ?? 0), 0) ?? 0;
    const todayBookings = bookings?.filter((b) => b.date === today && ["pending", "confirmed", "completed"].includes(b.status ?? "")).length ?? 0;

    const hourCounts: Record<string, number> = {};
    (bookings ?? []).forEach((b) => {
      const hour = b.time_slot?.slice(0, 2) ?? "00";
      hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
    });
    const peakHours = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([h, c]) => `${h}:00 (${c} bookings)`);

    const lastCheckInByUser = new Map<string, Date>();
    (checkIns ?? []).forEach((c) => {
      const at = new Date(c.checked_in_at);
      const cur = lastCheckInByUser.get(c.user_id);
      if (!cur || at > cur) lastCheckInByUser.set(c.user_id, at);
    });
    const atRisk = Array.from(lastCheckInByUser.entries())
      .filter(([, d]) => {
        const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
        return diff >= 10;
      })
      .map(([uid]) => uid);

    const { data: atRiskProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", atRisk);

    const context = `
Gym Data Summary:
- Total Revenue (PHP): ${totalRevenue}
- Active Memberships: ${activeMembers}
- Today's PT Bookings: ${todayBookings}
- Current Occupancy: ${gymStatus?.current_occupancy ?? 0} / ${gymStatus?.max_capacity ?? 100}
- Peak booking hours (last 10 days): ${peakHours.join(", ") || "No data"}
- At-risk members (no check-in 10+ days): ${(atRiskProfiles ?? []).map((p) => p.full_name || p.email).join(", ") || "None"}
`;

    const messages = [
      {
        role: "system" as const,
        content: `You are a gym business analyst. Analyze the provided gym data and return a JSON object with exactly these keys:
- revenue_forecast: string (1-2 sentences on revenue outlook)
- peak_hour_trends: string (1-2 sentences on when members book most)
- at_risk_summary: string (list or summary of at-risk members who haven't checked in for 10+ days)

Be concise and actionable. Return ONLY valid JSON, no markdown.`,
      },
      {
        role: "user" as const,
        content: context,
      },
    ];

    // Use Groq first (you have Groq keys), fallback to Grok if configured
    let content: string;
    try {
      const res = await groqChatWithRotation(messages, { max_tokens: 512 });
      content = res.content;
    } catch {
      const res = await grokChatWithRotation(messages, { max_tokens: 512 });
      content = res.content;
    }
    const cleaned = content.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      revenue_forecast?: string;
      peak_hour_trends?: string;
      at_risk_summary?: string;
    };

    return NextResponse.json({
      revenue_forecast: parsed.revenue_forecast ?? "Unable to generate.",
      peak_hour_trends: parsed.peak_hour_trends ?? "Unable to generate.",
      at_risk_summary: parsed.at_risk_summary ?? "No at-risk members identified.",
    });
  } catch (err) {
    console.error("Grok insights error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate insights" },
      { status: 500 }
    );
  }
}
