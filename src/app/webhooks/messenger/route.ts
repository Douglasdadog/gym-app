import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { summarizeConversationForLead } from "@/lib/leadSummary";
import { BOT_TIER_SUMMARY } from "@/lib/tiers";

// Groq (Grok-style) chat completions endpoint
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

type MessengerEvent = {
  sender?: { id: string };
  message?: {
    text?: string;
    is_echo?: boolean;
    is_deleted?: boolean;
    is_unsupported?: boolean;
    attachments?: unknown[];
  };
};

type ChatMessage = { role: "user" | "assistant"; content: string };

// GET: Webhook verification (Meta sends hub.challenge here)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

async function insertLead(lead: {
  name: string;
  email: string | null;
  phone: string | null;
  interest: string;
  source: string;
  notes?: string;
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("Supabase server env vars are missing");
    return;
  }

  const safePhone = (lead.phone ?? "").trim();
  const safeInterest = lead.interest?.trim() || "Not specified";

  const supabaseAdmin = createServiceClient(supabaseUrl, serviceKey);
  const { error } = await supabaseAdmin.from("leads").insert({
    name: lead.name,
    email: lead.email,
    phone: safePhone,
    interest: safeInterest,
    source: lead.source,
    notes: lead.notes ?? null,
  });

  if (error) {
    console.error("Insert lead from Messenger error:", error);
  }
}

async function saveConversationMessage(
  senderId: string,
  message: ChatMessage,
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("Supabase server env vars are missing");
    return;
  }

  const supabaseAdmin = createServiceClient(supabaseUrl, serviceKey);
  const { error } = await supabaseAdmin.from("messenger_conversations").insert({
    sender_id: senderId,
    role: message.role,
    content: message.content,
  });

  if (error) {
    console.error("Save messenger conversation error:", error);
  }
}

async function getConversationMessages(senderId: string): Promise<ChatMessage[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("Supabase server env vars are missing");
    return [];
  }

  const supabaseAdmin = createServiceClient(supabaseUrl, serviceKey);
  const { data, error } = await supabaseAdmin
    .from("messenger_conversations")
    .select("role, content")
    .eq("sender_id", senderId)
    .order("created_at", { ascending: false })
    .limit(15);

  if (error) {
    console.error("Get messenger conversation error:", error);
    return [];
  }

  const rows = (data ?? []) as ChatMessage[];
  // We fetched newest first; reverse to chronological order.
  return rows.reverse();
}

function extractLeadFromMessages(messages: ChatMessage[]) {
  let name: string | null = null;
  let email: string | null = null;
  let phone: string | null = null;
  let interest: string | null = null;

  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const phoneRegex = /\+?\d[\d\s\-]{6,}/;

  for (const m of messages) {
    if (m.role !== "user") continue;
    const text = m.content;

    if (!name) {
      const mName =
        text.match(/my name is\s+([a-zA-Z][a-zA-Z\s]{1,40})/i) ||
        text.match(/i am\s+([a-zA-Z][a-zA-Z\s]{1,40})/i) ||
        text.match(/i'm\s+([a-zA-Z][a-zA-Z\s]{1,40})/i);
      if (mName) name = mName[1].trim();
    }

    if (!email) {
      const mEmail = text.match(emailRegex);
      if (mEmail) email = mEmail[0].trim();
    }

    if (!phone) {
      const mPhone = text.match(phoneRegex);
      if (mPhone) phone = mPhone[0].trim();
    }

    if (!interest) {
      const mInterest =
        text.match(/interested in\s+(.+)/i) ||
        text.match(/looking for\s+(.+)/i) ||
        text.match(/want to focus on\s+(.+)/i);
      if (mInterest) interest = mInterest[1].trim();
    }
  }

  if (!name || (!email && !phone)) return null;

  return {
    name,
    email,
    phone,
    interest: interest ?? "Not specified",
  };
}

async function maybeInsertLeadFromMessages(messages: ChatMessage[]) {
  const lead = extractLeadFromMessages(messages);
  if (!lead) return;

  const { interest, notes } = await summarizeConversationForLead(messages);

  await insertLead({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    interest: interest || lead.interest,
    source: "meta-messenger",
    notes: notes || "Captured via Apex Assistant (Messenger) conversational flow",
  });
}

async function sendChannelMessage(recipientId: string, text: string, token: string | undefined) {
  if (!token?.trim()) {
    console.warn("[Meta] Reply skipped: missing META_PAGE_ACCESS_TOKEN");
    return;
  }

  const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${encodeURIComponent(
    token.trim(),
  )}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      messaging_type: "RESPONSE",
      message: { text },
    }),
  });

  if (!res.ok) {
    const raw = await res.text();
    type MetaError = {
      message?: string;
      type?: string;
      code?: number;
      error_subcode?: number;
      fbtrace_id?: string;
    };
    let meta: MetaError | null = null;
    try {
      const parsed = JSON.parse(raw) as { error?: MetaError };
      meta = parsed.error ?? null;
    } catch {
      meta = null;
    }

    const code = meta?.code;
    const sub = meta?.error_subcode;
    const msg = meta?.message ?? raw.slice(0, 300);

    if ((code === 100 || msg.includes("No matching user")) && res.status === 400) {
      console.warn(
        "[Meta] Send failed: No matching user. For Instagram DMs: ensure the Page is linked to the IG Professional account, webhook is subscribed to Instagram messages, token has instagram_manage_messages, and user messaged you within 24 hours.",
        { code, sub, fbtrace_id: meta?.fbtrace_id, msg }
      );
    } else if (code === 10 || code === 200 || msg.toLowerCase().includes("permission")) {
      console.warn(
        "[Meta] Send failed: missing permissions. Ensure META_PAGE_ACCESS_TOKEN is a Page token for the linked Page and has instagram_manage_messages + pages_manage_metadata (Advanced access if needed).",
        { code, sub, fbtrace_id: meta?.fbtrace_id, msg }
      );
    } else {
      console.error("[Meta] Send message error", res.status, { code, sub, fbtrace_id: meta?.fbtrace_id, msg });
    }
  }
}

async function clearConversation(senderId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("Supabase server env vars are missing");
    return;
  }

  const supabaseAdmin = createServiceClient(supabaseUrl, serviceKey);
  const { error } = await supabaseAdmin
    .from("messenger_conversations")
    .delete()
    .eq("sender_id", senderId);

  if (error) {
    console.error("Clear messenger conversation error", error);
  }
}

// POST: Incoming Messenger events
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("[Meta webhook] object=", body?.object, "entries=", Array.isArray(body?.entry) ? body.entry.length : 0);

    if ((body.object !== "page" && body.object !== "instagram") || !Array.isArray(body.entry)) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    for (const entry of body.entry) {
      const messaging: MessengerEvent[] = entry.messaging ?? [];
      for (const event of messaging) {
        const senderId = event.sender?.id;
        const isEcho = event.message?.is_echo;
        if (isEcho) continue;

        const text =
          event.message?.text ??
          (event.message?.attachments?.length ? "[Sent an attachment]" : null);
        if (!senderId || !text) continue;

        const lower = text.toLowerCase().trim();

        // Reset phrase: clear stored history and start a fresh flow.
        if (
          lower === "reset" ||
          lower === "start over" ||
          lower === "new chat" ||
          lower === "restart"
        ) {
          await clearConversation(senderId);
          // For Instagram Messaging API, Meta requires a *Facebook Page access token*
          // for the Page linked to the Instagram Professional account.
          const resetToken =
            process.env.META_PAGE_ACCESS_TOKEN?.trim() || process.env.META_IG_ACCESS_TOKEN?.trim();
          if (resetToken) {
            await sendChannelMessage(
              senderId,
              "No worries, let’s start fresh. Are you mainly interested in memberships, personal training, or a gym tour?",
              resetToken,
            );
          }
          continue;
        }

        // Save the new user message in our conversation history
        await saveConversationMessage(senderId, { role: "user", content: text });

        const history = await getConversationMessages(senderId);

        const systemPrompt =
          "You are Apex Assistant, a professional, high-energy gym consultant for Cyber-Gym in the Philippines (assume Metro Manila, currency PHP). " +
          "You run a dynamic lead-generation flow, always staying short, casual, and clear. Never send long paragraphs. Usually end with a question to guide the next step, unless the user is just saying thanks or the conversation is clearly ending. " +
          "Conversation stages (follow them naturally, based on context): " +
          "1) Greeting: If this feels like the start of a chat, greet the user and ask if they’re mainly interested in Memberships, Personal Training, or a Gym Tour. " +
          "2) Showcase: When they ask about services, highlight state-of-the-art equipment and expert coaches, in 1–2 short sentences. " +
          "3) Pivot: Look for any opening to offer a Free 3-Day Trial Pass (for people who seem even a bit interested). " +
          "4) Lead capture: If they say yes to a trial or clearly want to join/book, ask for their Name, then Email, then Phone Number one by one (each in a separate, short message). Never ask more than three lead-capture questions in a row. " +
          "Very important: once the conversation already contains their name and at least one contact detail (email or phone), do NOT ask for those again or loop back to lead-capture. From that point, focus on answering questions and giving helpful next steps. " +
          "Assume the user is in the Philippines: talk about prices in PHP (₱) and do not ask if their phone number is from another country unless they explicitly bring it up. " +
          BOT_TIER_SUMMARY + " " +
          "Personality: upbeat, friendly, never pushy. Use simple language. If you don’t know exact prices or schedules, say they can be confirmed with the gym team. " +
          "Do NOT mention that you are following stages or flows; just sound natural. Always remember and respect previous answers within the conversation.";

        const groqMessages = [
          { role: "system" as const, content: systemPrompt },
          ...history.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        ];

        const keys = [
          process.env.GROQ_API_KEY_1,
          process.env.GROQ_API_KEY_2,
          process.env.GROQ_API_KEY_3,
          process.env.GROQ_API_KEY_4,
          process.env.GROQ_API_KEY_5,
          process.env.GROQ_API_KEY_6,
          process.env.GROQ_API_KEY_7,
          process.env.GROQ_API_KEY_8,
        ].filter(Boolean) as string[];

        let replyText =
          "Sorry, I had trouble replying just now. Could you send that again?";

        if (keys.length > 0) {
          let lastError: unknown = null;
          for (const key of keys) {
            try {
              const groqRes = await fetch(GROQ_API_URL, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${key}`,
                },
                body: JSON.stringify({
                  model: GROQ_MODEL,
                  messages: groqMessages,
                  stream: false,
                }),
              });

              if (groqRes.status === 429) {
                lastError = new Error("Rate limited on current key");
                continue;
              }

              if (!groqRes.ok) {
                const errText = await groqRes.text();
                console.error("Groq Messenger error:", groqRes.status, errText);
                lastError = new Error(
                  `Groq Messenger error ${groqRes.status}: ${errText}`,
                );
                continue;
              }

              const data = (await groqRes.json()) as {
                choices?: { message?: { content?: string } }[];
              };

              const candidate =
                data.choices?.[0]?.message?.content?.slice(0, 500) ?? null;
              if (candidate) {
                replyText = candidate;
              }
              break;
            } catch (err) {
              console.error("Groq Messenger network error:", err);
              lastError = err;
            }
          }

          if (lastError) {
            console.error("Groq Messenger final error:", lastError);
          }
        }

        await saveConversationMessage(senderId, {
          role: "assistant",
          content: replyText,
        });

        await maybeInsertLeadFromMessages([...history, { role: "user", content: text }]);

        // Messenger + Instagram replies: use the Page access token whenever available.
        // Meta requires a Page token with `instagram_manage_messages` to reply to IG DMs.
        const sendToken =
          process.env.META_PAGE_ACCESS_TOKEN?.trim() || process.env.META_IG_ACCESS_TOKEN?.trim();
        if (sendToken?.trim()) {
          await sendChannelMessage(senderId, replyText, sendToken);
        } else {
          console.warn(
            "Meta DM received; reply skipped. Set META_PAGE_ACCESS_TOKEN (Page must be linked to IG and token must include instagram_manage_messages)."
          );
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Messenger webhook error", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}


