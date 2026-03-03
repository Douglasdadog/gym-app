import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: checkIns } = await supabaseAdmin
    .from("gym_check_ins")
    .select("user_id")
    .is("checked_out_at", null);

  if (!checkIns?.length) {
    return NextResponse.json({ members: [] });
  }

  const userIds = Array.from(new Set(checkIns.map((c) => c.user_id)));
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  const members = (profiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name || p.email?.split("@")[0] || "Member",
  }));

  return NextResponse.json({ members });
}
