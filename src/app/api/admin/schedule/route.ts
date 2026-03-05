import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if ((profile as { role?: string } | null)?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // yyyy-MM
    const year = searchParams.get("year");
    const trainerId = searchParams.get("trainer_id"); // optional filter

    const now = new Date();
    const yearNum = year ? parseInt(year, 10) : now.getFullYear();
    const monthNum = month ? parseInt(month, 10) - 1 : now.getMonth();
    const start = new Date(yearNum, monthNum, 1);
    const end = new Date(yearNum, monthNum + 1, 0);

    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    let query = supabaseAdmin
      .from("bookings")
      .select("id, date, time_slot, location_type, status, user_id, trainer_id")
      .gte("date", startStr)
      .lte("date", endStr)
      .in("status", ["pending", "confirmed", "completed"])
      .order("date")
      .order("time_slot");

    if (trainerId) query = query.eq("trainer_id", trainerId);

    const { data: bookings, error: bookingsError } = await query;

    if (bookingsError) {
      console.error("Schedule bookings error:", bookingsError);
      return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 });
    }

    const userIds = Array.from(new Set((bookings ?? []).map((b: { user_id: string }) => b.user_id)));
    const trainerIds = Array.from(new Set((bookings ?? []).map((b: { trainer_id: string }) => b.trainer_id)));

    const [profilesRes, trainersRes] = await Promise.all([
      userIds.length ? supabaseAdmin.from("profiles").select("id, full_name").in("id", userIds) : { data: [] },
      trainerIds.length ? supabaseAdmin.from("trainers").select("id, name").in("id", trainerIds) : { data: [] },
    ]);

    const profileMap = new Map((profilesRes.data ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name || "—"]));
    const trainerMap = new Map((trainersRes.data ?? []).map((t: { id: string; name: string }) => [t.id, t.name]));

    const events = (bookings ?? []).map((b: { id: string; date: string; time_slot: string; location_type: string; status: string; user_id: string; trainer_id: string }) => ({
      id: b.id,
      date: b.date,
      time_slot: b.time_slot,
      location_type: b.location_type,
      status: b.status,
      member_name: profileMap.get(b.user_id) ?? "—",
      trainer_name: trainerMap.get(b.trainer_id) ?? "—",
      trainer_id: b.trainer_id,
    }));

    const { data: trainersList } = await supabaseAdmin.from("trainers").select("id, name").order("name");
    return NextResponse.json({
      events,
      trainers: trainersList ?? [],
      range: { start: startStr, end: endStr, year: yearNum, month: monthNum },
    });
  } catch (err) {
    console.error("Admin schedule GET error:", err);
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 });
  }
}
