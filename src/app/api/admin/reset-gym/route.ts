import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

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
      return NextResponse.json(
        { error: "Forbidden. Your account needs admin role. Run in Supabase SQL Editor: UPDATE profiles SET role = 'admin' WHERE email = 'YOUR_EMAIL';" },
        { status: 403 }
      );
    }

    // Close all active check-ins (set checked_out_at for any with null)
    const { data: activeCheckIns } = await supabaseAdmin
      .from("gym_check_ins")
      .select("id")
      .is("checked_out_at", null);

    if (activeCheckIns?.length) {
      for (const row of activeCheckIns) {
        await supabaseAdmin
          .from("gym_check_ins")
          .update({ checked_out_at: new Date().toISOString() })
          .eq("id", row.id);
      }
    }

    // Reset gym_status occupancy to 0
    const { data: status } = await supabaseAdmin.from("gym_status").select("id").single();
    if (status) {
      await supabaseAdmin
        .from("gym_status")
        .update({ current_occupancy: 0, last_updated: new Date().toISOString() })
        .eq("id", status.id);
    }

    return NextResponse.json({ success: true, message: "Gym reset to zero. All check-ins closed, occupancy set to 0." });
  } catch (e) {
    console.error("Reset gym error:", e);
    return NextResponse.json({ error: "Failed to reset gym" }, { status: 500 });
  }
}
