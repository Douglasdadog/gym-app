import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type InboxRow = {
  sender_id: string;
  channel: string | null;
  role: string;
  content: string;
  created_at: string;
};

async function getAdminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 as const };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseAdmin = createServiceClient(supabaseUrl, serviceKey);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Forbidden", status: 403 as const };
  return { supabaseAdmin };
}

async function sendMetaMessage(senderId: string, text: string) {
  const token = process.env.META_PAGE_ACCESS_TOKEN?.trim() || process.env.META_IG_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("Missing META_PAGE_ACCESS_TOKEN");
  const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: senderId },
      messaging_type: "RESPONSE",
      message: { text },
    }),
  });
  if (!res.ok) {
    const raw = await res.text();
    throw new Error(`Meta send failed: ${raw.slice(0, 300)}`);
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminClient();
    if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });
    const { supabaseAdmin } = admin;

    const senderId = request.nextUrl.searchParams.get("sender_id");
    const channel = request.nextUrl.searchParams.get("channel");

    if (senderId) {
      let query = supabaseAdmin
        .from("messenger_conversations")
        .select("sender_id, channel, role, content, created_at")
        .eq("sender_id", senderId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (channel) query = query.eq("channel", channel);
      const { data, error } = await query;
      if (error) return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
      return NextResponse.json({ messages: data ?? [] });
    }

    const { data, error } = await supabaseAdmin
      .from("messenger_conversations")
      .select("sender_id, channel, role, content, created_at")
      .order("created_at", { ascending: false })
      .limit(600);
    if (error) return NextResponse.json({ error: "Failed to fetch threads" }, { status: 500 });

    const map = new Map<
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

    for (const row of (data ?? []) as InboxRow[]) {
      const ch = row.channel === "instagram" ? "instagram" : "messenger";
      const key = `${ch}:${row.sender_id}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          sender_id: row.sender_id,
          channel: ch,
          last_message: row.content,
          last_role: row.role === "assistant" ? "assistant" : "user",
          last_at: row.created_at,
          message_count: 1,
        });
      } else {
        existing.message_count += 1;
      }
    }

    const threads = [...map.values()].sort(
      (a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime()
    );
    return NextResponse.json({ threads });
  } catch (err) {
    console.error("Admin inbox GET error:", err);
    return NextResponse.json({ error: "Failed to fetch inbox" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminClient();
    if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });
    const { supabaseAdmin } = admin;

    const body = await request.json().catch(() => ({}));
    const senderId = String(body.sender_id ?? "").trim();
    const text = String(body.text ?? "").trim();
    const channel = String(body.channel ?? "").trim().toLowerCase() === "instagram" ? "instagram" : "messenger";
    if (!senderId || !text) {
      return NextResponse.json({ error: "sender_id and text are required" }, { status: 400 });
    }

    await sendMetaMessage(senderId, text);

    const { error } = await supabaseAdmin.from("messenger_conversations").insert({
      sender_id: senderId,
      channel,
      role: "assistant",
      content: text,
    });
    if (error) {
      console.error("Save admin reply error:", error);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send reply";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

