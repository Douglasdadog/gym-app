import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createServiceClient(supabaseUrl, serviceKey);

    const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if ((profile as { role?: string } | null)?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Lead ID required" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.status !== undefined) {
      const s = String(body.status).toLowerCase();
      if (["new", "contacted", "won", "lost"].includes(s)) updates.status = s;
    }
    if (body.notes !== undefined) updates.notes = body.notes == null ? null : String(body.notes);
    if (body.assigned_to_id !== undefined) {
      updates.assigned_to_id = body.assigned_to_id == null || body.assigned_to_id === "" ? null : body.assigned_to_id;
    }

    const { data, error } = await supabaseAdmin
      .from("leads")
      .update(updates)
      .eq("id", id)
      .select("id, status, notes, assigned_to_id, updated_at")
      .single();

    if (error) {
      console.error("Update lead error:", error);
      return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
    }
    return NextResponse.json({ lead: data });
  } catch (err) {
    console.error("Admin lead PATCH error:", err);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}
