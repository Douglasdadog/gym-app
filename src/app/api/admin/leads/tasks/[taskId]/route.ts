import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
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

    const { taskId } = await params;
    if (!taskId) return NextResponse.json({ error: "Task ID required" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const updates: Record<string, unknown> = {};
    if (body.completed !== undefined) {
      updates.completed_at = body.completed ? new Date().toISOString() : null;
    }
    if (body.title !== undefined) updates.title = String(body.title).trim();
    if (body.due_at !== undefined) updates.due_at = body.due_at ? new Date(body.due_at).toISOString() : null;
    if (body.assigned_to_id !== undefined) {
      updates.assigned_to_id = body.assigned_to_id == null || body.assigned_to_id === "" ? null : body.assigned_to_id;
    }

    const { data, error } = await supabaseAdmin
      .from("lead_tasks")
      .update(updates)
      .eq("id", taskId)
      .select()
      .single();

    if (error) {
      console.error("Update lead task error:", error);
      return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }
    return NextResponse.json({ task: data });
  } catch (err) {
    console.error("Admin lead task PATCH error:", err);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
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

    const { taskId } = await params;
    if (!taskId) return NextResponse.json({ error: "Task ID required" }, { status: 400 });

    const { error } = await supabaseAdmin.from("lead_tasks").delete().eq("id", taskId);
    if (error) {
      console.error("Delete lead task error:", error);
      return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin lead task DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
