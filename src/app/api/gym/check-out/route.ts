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

  if (!active) {
    return NextResponse.json({ error: "Not checked in. Check in first." }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("gym_check_ins")
    .update({ checked_out_at: new Date().toISOString() })
    .eq("id", active.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const { data: status } = await supabase.from("gym_status").select("*").single();
  if (!status) return NextResponse.json({ error: "Gym status not found" }, { status: 404 });

  const newOccupancy = Math.max(status.current_occupancy - 1, 0);
  const { error } = await supabase
    .from("gym_status")
    .update({ current_occupancy: newOccupancy, last_updated: new Date().toISOString() })
    .eq("id", status.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ current_occupancy: newOccupancy });
}
