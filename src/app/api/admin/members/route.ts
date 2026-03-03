import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
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

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, membership_tier, created_at")
      .order("created_at", { ascending: false });

    if (!profiles?.length) {
      return NextResponse.json({ members: [] });
    }

    const userIds = profiles.map((p) => p.id);
    const { data: memberships } = await supabaseAdmin
      .from("memberships")
      .select("id, user_id, type, status, created_at")
      .in("user_id", userIds)
      .order("created_at", { ascending: false });

    const latestByUser = new Map<string, { id: string; type: string; status: string }>();
    for (const m of memberships ?? []) {
      if (!latestByUser.has(m.user_id)) {
        latestByUser.set(m.user_id, { id: m.id, type: m.type ?? "None", status: m.status ?? "—" });
      }
    }

    const members = profiles.map((p) => {
      const mem = latestByUser.get(p.id);
      return {
        id: p.id,
        membership_id: mem?.id ?? p.id,
        user_id: p.id,
        email: p.email ?? "—",
        full_name: p.full_name ?? "—",
        tier: mem?.type ?? p.membership_tier ?? "None",
        status: mem?.status ?? (p.membership_tier && p.membership_tier !== "None" ? "active" : "pending"),
        join_date: p.created_at ? new Date(p.created_at).toLocaleDateString() : "—",
      };
    });

    return NextResponse.json({ members });
  } catch (e) {
    console.error("Admin members error:", e);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}
