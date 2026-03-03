import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ isCheckedIn: false });

  const { data: active } = await supabase
    .from("gym_check_ins")
    .select("id")
    .eq("user_id", user.id)
    .is("checked_out_at", null)
    .maybeSingle();

  return NextResponse.json(
    { isCheckedIn: !!active },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );
}
