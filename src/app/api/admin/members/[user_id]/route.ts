import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

async function ensureAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), admin: null };

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
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), admin: null };
  }
  return { error: null, admin: supabaseAdmin };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string }> }
) {
  try {
    const { error: authError, admin: supabaseAdmin } = await ensureAdmin();
    if (authError) return authError;
    if (!supabaseAdmin) return NextResponse.json({ error: "Server error" }, { status: 500 });

    const { user_id } = await params;
    if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

    const body = await request.json();
    const action = body?.action as string;
    if (!action || !["freeze", "unfreeze", "remove"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Use 'freeze', 'unfreeze', or 'remove'." }, { status: 400 });
    }

    // 1. Check out user from gym if they're in
    const { data: activeCheckIns } = await supabaseAdmin
      .from("gym_check_ins")
      .select("id")
      .eq("user_id", user_id)
      .is("checked_out_at", null);

    if (activeCheckIns?.length) {
      for (const row of activeCheckIns) {
        await supabaseAdmin
          .from("gym_check_ins")
          .update({ checked_out_at: new Date().toISOString() })
          .eq("id", row.id);
      }
      // Decrement occupancy
      const { data: status } = await supabaseAdmin.from("gym_status").select("id, current_occupancy").single();
      if (status) {
        const newOccupancy = Math.max((status.current_occupancy ?? 0) - activeCheckIns.length, 0);
        await supabaseAdmin
          .from("gym_status")
          .update({ current_occupancy: newOccupancy, last_updated: new Date().toISOString() })
          .eq("id", status.id);
      }
    }

    if (action === "freeze") {
      // Update memberships to cancelled (effectively frozen)
      await supabaseAdmin
        .from("memberships")
        .update({ status: "cancelled", type: "None" })
        .eq("user_id", user_id);

      await supabaseAdmin
        .from("profiles")
        .update({ membership_tier: "None" })
        .eq("id", user_id);

      return NextResponse.json({ ok: true });
    }

    if (action === "unfreeze") {
      // Restore membership to active with Basic tier
      await supabaseAdmin
        .from("memberships")
        .update({ status: "active", type: "Basic" })
        .eq("user_id", user_id);

      await supabaseAdmin
        .from("profiles")
        .update({ membership_tier: "Basic" })
        .eq("id", user_id);

      return NextResponse.json({ ok: true });
    }

    // action === "remove" — delete auth user (profiles, memberships, gym_check_ins cascade)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);
    if (deleteError) {
      console.error("Auth delete error:", deleteError);
      return NextResponse.json({ error: "Failed to remove account" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Admin member action error:", e);
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}
