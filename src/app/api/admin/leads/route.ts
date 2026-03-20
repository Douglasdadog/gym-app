import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type ConversationRow = {
  sender_id: string;
  channel: string | null;
  role: string;
  content: string;
  created_at: string;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createServiceClient(supabaseUrl, serviceKey);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: leadsData, error: leadsError } = await supabaseAdmin
      .from("leads")
      .select("id, created_at, updated_at, name, email, phone, interest, source, notes, status, assigned_to_id")
      .order("created_at", { ascending: false });

    if (leadsError) {
      console.error("Fetch leads error:", leadsError);
      return NextResponse.json(
        { error: "Failed to fetch leads" },
        { status: 500 },
      );
    }

    const { data: staff } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "admin")
      .order("full_name");

    const { data: conversationRows } = await supabaseAdmin
      .from("messenger_conversations")
      .select("sender_id, channel, role, content, created_at")
      .order("created_at", { ascending: false })
      .limit(400);

    const conversationMap = new Map<
      string,
      {
        sender_id: string;
        channel: "messenger" | "instagram";
        last_message: string;
        last_role: "user" | "assistant";
        last_at: string;
        message_count: number;
      }
    >();

    for (const row of (conversationRows ?? []) as ConversationRow[]) {
      const channel = row.channel === "instagram" ? "instagram" : "messenger";
      const key = `${channel}:${row.sender_id}`;
      const existing = conversationMap.get(key);
      if (!existing) {
        conversationMap.set(key, {
          sender_id: row.sender_id,
          channel,
          last_message: row.content,
          last_role: row.role === "assistant" ? "assistant" : "user",
          last_at: row.created_at,
          message_count: 1,
        });
      } else {
        existing.message_count += 1;
      }
    }

    const conversations = [...conversationMap.values()].sort(
      (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
    );

    return NextResponse.json({
      leads: leadsData ?? [],
      staff: staff ?? [],
      conversations,
    });
  } catch (err) {
    console.error("Admin leads GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 },
    );
  }
}

