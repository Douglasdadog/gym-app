import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: active } = await supabase
    .from("gym_check_ins")
    .select("id")
    .eq("user_id", user.id)
    .is("checked_out_at", null)
    .maybeSingle();

  if (active) {
    return NextResponse.json({ error: "Already checked in. Check out first." }, { status: 400 });
  }

  const { data: status } = await supabase.from("gym_status").select("*").single();
  if (!status) return NextResponse.json({ error: "Gym status not found" }, { status: 404 });

  const newOccupancy = Math.min(status.current_occupancy + 1, status.max_capacity);

  const { error: insertError } = await supabase.from("gym_check_ins").insert({
    user_id: user.id,
  });
  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ error: "Already checked in. Check out first." }, { status: 400 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { error } = await supabase
    .from("gym_status")
    .update({ current_occupancy: newOccupancy, last_updated: new Date().toISOString() })
    .eq("id", status.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ current_occupancy: newOccupancy });
}
