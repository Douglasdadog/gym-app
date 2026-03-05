import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

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

type MessengerEvent = {
  sender?: { id: string };
  message?: { text?: string };
};

type SessionStage = "ask_name" | "ask_email" | "ask_phone" | "ask_interest" | "completed";

type MessengerLeadSession = {
  id: string;
  sender_id: string;
  stage: SessionStage;
  name: string | null;
  email: string | null;
  phone: string | null;
  interest: string | null;
};

async function insertLead(lead: {
  name: string;
  email: string;
  phone: string;
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

  const supabaseAdmin = createServiceClient(supabaseUrl, serviceKey);
  const { error } = await supabaseAdmin.from("leads").insert({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    interest: lead.interest,
    source: lead.source,
    notes: lead.notes ?? null,
  });

  if (error) {
    console.error("Insert lead from Messenger error:", error);
  }
}

async function getOrCreateSession(senderId: string): Promise<MessengerLeadSession> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase server env vars are missing");
  }

  const supabaseAdmin = createServiceClient(supabaseUrl, serviceKey);

  const { data: existing } = await supabaseAdmin
    .from("messenger_lead_sessions")
    .select("id, sender_id, stage, name, email, phone, interest")
    .eq("sender_id", senderId)
    .in("stage", ["ask_name", "ask_email", "ask_phone", "ask_interest"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing as MessengerLeadSession;

  const { data, error } = await supabaseAdmin
    .from("messenger_lead_sessions")
    .insert({
      sender_id: senderId,
      stage: "ask_name" as SessionStage,
      name: null,
      email: null,
      phone: null,
      interest: null,
    })
    .select("id, sender_id, stage, name, email, phone, interest")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to create session");
  }

  return data as MessengerLeadSession;
}

async function updateSession(
  sessionId: string,
  patch: Partial<Omit<MessengerLeadSession, "id" | "sender_id">>,
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase server env vars are missing");
  }

  const supabaseAdmin = createServiceClient(supabaseUrl, serviceKey);
  await supabaseAdmin
    .from("messenger_lead_sessions")
    .update(patch)
    .eq("id", sessionId);
}

async function sendMessengerText(recipientId: string, text: string) {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) {
    console.warn("META_PAGE_ACCESS_TOKEN not set; cannot reply to Messenger");
    return;
  }

  const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${encodeURIComponent(
    token,
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
    const body = await res.text();
    console.error("Messenger send error", res.status, body);
  }
}

async function handleFaqMessage(senderId: string, text: string) {
  const lower = text.toLowerCase();

  if (lower.includes("membership") || lower.includes("price") || lower.includes("plan")) {
    await sendMessengerText(
      senderId,
      "We’ve got 3 main memberships:\nBasic – gym access + equipment\nElite – Basic + sauna, classes, priority booking\nVIP – Elite + home PT priority + unlimited AI coaching.",
    );
    return;
  }

  if (lower.includes("hour") || lower.includes("open") || lower.includes("time")) {
    await sendMessengerText(
      senderId,
      "We’re typically open early till late every day so you can train before or after work. Exact hours can vary by location, so we’ll confirm when we contact you.",
    );
    return;
  }

  if (
    lower.includes("trainer") ||
    lower.includes("coach") ||
    lower.includes("pt") ||
    lower.includes("personal training")
  ) {
    await sendMessengerText(
      senderId,
      "We offer PT at the gym or at home. You pick days and time windows that fit you and we match you with a trainer.",
    );
    return;
  }

  if (lower.includes("nutrition") || lower.includes("diet") || lower.includes("meal")) {
    await sendMessengerText(
      senderId,
      "Cyber-Gym includes an AI nutrition coach so you can log meals, get macro breakdowns, and keep everything synced with your training.",
    );
    return;
  }

  await sendMessengerText(
    senderId,
    "Got you. I can answer questions about memberships, PT, hours, or nutrition—and if you’d like us to contact you, I can also grab your details.",
  );
}

// POST: Incoming Messenger events
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Messenger webhook event", JSON.stringify(body, null, 2));

    if (body.object !== "page" || !Array.isArray(body.entry)) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    for (const entry of body.entry) {
      const messaging: MessengerEvent[] = entry.messaging ?? [];
      for (const event of messaging) {
        const senderId = event.sender?.id;
        const text = event.message?.text;
        if (!senderId || !text) continue;

        const lower = text.toLowerCase();

        // Basic conversational + lead-capture flow.
        const session = await getOrCreateSession(senderId);

        const seemsInterested =
          lower.includes("join") ||
          lower.includes("sign up") ||
          lower.includes("signup") ||
          lower.includes("membership") ||
          lower.includes("price") ||
          lower.includes("pt") ||
          lower.includes("trainer") ||
          lower.includes("coach") ||
          lower.includes("home session") ||
          lower.includes("home training");

        if (session.stage === "ask_name" && !session.name && !seemsInterested) {
          // Treat as FAQ / casual question, not yet lead capture.
          await handleFaqMessage(senderId, text);
          continue;
        }

        if (session.stage === "ask_name") {
          const name = text.trim();
          await updateSession(session.id, { name, stage: "ask_email" });
          await sendMessengerText(
            senderId,
            `Nice to meet you, ${name}! What's the best email to contact you on?`,
          );
          continue;
        }

        if (session.stage === "ask_email") {
          const email = text.trim();
          if (!email.includes("@")) {
            await sendMessengerText(
              senderId,
              "That doesn't look like a valid email. Please send it again (for example: you@example.com).",
            );
            continue;
          }
          await updateSession(session.id, { email, stage: "ask_phone" });
          await sendMessengerText(
            senderId,
            "Got it. What's your phone number, including country code?",
          );
          continue;
        }

        if (session.stage === "ask_phone") {
          const phone = text.trim();
          await updateSession(session.id, { phone, stage: "ask_interest" });
          await sendMessengerText(
            senderId,
            "Last one: what are you interested in? (e.g. Elite membership, VIP, PT sessions, home training, nutrition coaching)",
          );
          continue;
        }

        if (session.stage === "ask_interest") {
          const interest = text.trim();
          await updateSession(session.id, { interest, stage: "completed" });

          if (session.name && session.email && session.phone) {
            await insertLead({
              name: session.name,
              email: session.email,
              phone: session.phone,
              interest,
              source: "meta-messenger",
              notes: "Captured via Messenger conversational flow",
            });
          }

          await sendMessengerText(
            senderId,
            "Thanks! We’ve received your details and the Cyber-Gym team will reach out soon.",
          );
          continue;
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Messenger webhook error", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}


