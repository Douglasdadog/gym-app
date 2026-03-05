import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: leadId } = await params;
    if (!leadId) return NextResponse.json({ error: "Lead ID required" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("lead_tasks")
      .select("id, lead_id, assigned_to_id, title, due_at, completed_at, created_at, created_by_id")
      .eq("lead_id", leadId)
      .order("due_at", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Fetch lead tasks error:", error);
      return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
    }
    return NextResponse.json({ tasks: data ?? [] });
  } catch (err) {
    console.error("Admin lead tasks GET error:", err);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: leadId } = await params;
    if (!leadId) return NextResponse.json({ error: "Lead ID required" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const title = body.title != null ? String(body.title).trim() : "";
    if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

    const dueAt = body.due_at ? new Date(body.due_at).toISOString() : null;
    const assignedToId = body.assigned_to_id == null || body.assigned_to_id === "" ? null : body.assigned_to_id;

    const { data, error } = await supabaseAdmin
      .from("lead_tasks")
      .insert({
        lead_id: leadId,
        assigned_to_id: assignedToId,
        title,
        due_at: dueAt,
        created_by_id: user.id,
      })
      .select("id, lead_id, assigned_to_id, title, due_at, completed_at, created_at")
      .single();

    if (error) {
      console.error("Create lead task error:", error);
      return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }
    return NextResponse.json({ task: data });
  } catch (err) {
    console.error("Admin lead tasks POST error:", err);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
