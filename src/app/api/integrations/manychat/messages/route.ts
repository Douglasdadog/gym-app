import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type ManyChatPayload = {
  channel?: string;
  sender_id?: string | number;
  sender_name?: string;
  direction?: "inbound" | "outbound";
  text?: string;
  created_at?: string;
};

function isAllowed(req: NextRequest): boolean {
  const expected = process.env.MANYCHAT_WEBHOOK_SECRET?.trim();
  if (!expected) return false;
  const provided = req.headers.get("x-manychat-secret")?.trim();
  return !!provided && provided === expected;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAllowed(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as ManyChatPayload;
    const senderId = String(body.sender_id ?? "").trim();
    const text = String(body.text ?? "").trim();
    if (!senderId || !text) {
      return NextResponse.json({ error: "sender_id and text are required" }, { status: 400 });
    }

    const channel = String(body.channel ?? "instagram").toLowerCase() === "messenger" ? "messenger" : "instagram";
    const role = body.direction === "outbound" ? "assistant" : "user";
    const createdAt = body.created_at ? new Date(body.created_at).toISOString() : new Date().toISOString();
    const senderName = String(body.sender_name ?? "").trim();
    const content = senderName && role === "user" ? `${text}\n\n[ManyChat sender: ${senderName}]` : text;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createServiceClient(supabaseUrl, serviceKey);

    const { error } = await supabaseAdmin.from("messenger_conversations").insert({
      sender_id: senderId,
      channel,
      role,
      content,
      created_at: createdAt,
    });
    if (error) {
      console.error("ManyChat save message error:", error);
      return NextResponse.json({ error: "Failed to store message" }, { status: 500 });
    }

    // Upsert a lightweight lead row for IG/Messenger if missing.
    const source = channel === "instagram" ? "meta-instagram" : "meta-messenger";
    const senderMarker = `[sender:${senderId}]`;
    const { data: existingLead } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("source", source)
      .ilike("notes", `%${senderMarker}%`)
      .limit(1)
      .maybeSingle();
    if (!existingLead?.id) {
      await supabaseAdmin.from("leads").insert({
        name:
          senderName ||
          (channel === "instagram"
            ? `Instagram User (${senderId.slice(0, 8)})`
            : `Messenger User (${senderId.slice(0, 8)})`),
        email: null,
        phone: null,
        interest: "Not specified",
        source,
        notes: `Captured via ManyChat sync ${senderMarker}`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("ManyChat webhook error:", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

