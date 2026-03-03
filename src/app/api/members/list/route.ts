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

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email, membership_tier")
    .order("full_name", { ascending: true, nullsFirst: false });

  const members = (profiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name || p.email?.split("@")[0] || "Member",
    membership_tier: p.membership_tier ?? "None",
  }));

  return NextResponse.json({ members });
}
