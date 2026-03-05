import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

type ChatMessage = { role: "user" | "assistant"; content: string };

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
        text.match(/looking for\s+(.+)/i);
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("Supabase server env vars missing, cannot save web chat lead");
    return;
  }

  const supabaseAdmin = createServiceClient(supabaseUrl, serviceKey);
  const { error } = await supabaseAdmin.from("leads").insert({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    interest: lead.interest,
    source: "web-chat",
    notes: "Captured via Apex Assistant conversational flow",
  });

  if (error) {
    console.error("Insert lead from web chat error:", error);
  }
}

export async function POST(request: Request) {
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

  if (keys.length === 0) {
    return NextResponse.json(
      {
        reply:
          "The chat assistant is not configured yet. Please contact the gym directly or try again later.",
      },
      { status: 200 },
    );
  }

  try {
    const body = await request.json();
    const incoming = body?.messages as ChatMessage[] | undefined;

    if (!incoming || !Array.isArray(incoming) || incoming.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 },
      );
    }

    const systemPrompt =
      "You are Apex Assistant, a professional, high-energy gym consultant for Cyber-Gym in Lagos. " +
      "You run a dynamic lead-generation flow, always staying short, casual, and clear. Never send long paragraphs. Always end with a question to guide the next step. " +
      "Conversation stages (follow them naturally, based on context): " +
      "1) Greeting: If this feels like the start of a chat, greet the user and ask if they’re mainly interested in Memberships, Personal Training, or a Gym Tour. " +
      "2) Showcase: When they ask about services, highlight state-of-the-art equipment and expert coaches, in 1–2 short sentences. " +
      "3) Pivot: Look for any opening to offer a Free 3-Day Trial Pass (for people who seem even a bit interested). " +
      "4) Lead capture: If they say yes to a trial or clearly want to join/book, ask for their Name, then Email, then Phone Number one by one (each in a separate, short message ending with a question). " +
      "Personality: upbeat, friendly, never pushy. Use simple language. If you don’t know exact prices or schedules, say they can be confirmed with the gym team. " +
      "Do NOT mention that you are following stages or flows; just sound natural. Always remember previous answers within the conversation.";

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...incoming.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

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
            messages,
            stream: false,
          }),
        });

        if (groqRes.status === 429) {
          // Rate limit on this key, try the next one.
          lastError = new Error("Rate limited on current key");
          continue;
        }

        if (!groqRes.ok) {
          const errorText = await groqRes.text();
          console.error("Groq API error:", groqRes.status, errorText);
          lastError = new Error(
            `Groq API error ${groqRes.status}: ${errorText}`,
          );
          // For non-429 errors, still try next key in case it's key-specific.
          continue;
        }

        const data = (await groqRes.json()) as {
          choices?: { message?: { content?: string } }[];
        };

        // Fire-and-forget lead capture based on the full conversation so far.
        maybeInsertLeadFromMessages(incoming).catch((e) =>
          console.error("Lead capture error", e),
        );

        const reply =
          data.choices?.[0]?.message?.content ||
          "I had trouble generating a response. Please try asking your question in a different way.";

        return NextResponse.json({ reply });
      } catch (err) {
        console.error("Groq API network error with one key:", err);
        lastError = err;
        // Try next key.
      }
    }

    console.error("All Groq API keys failed", lastError);
    return NextResponse.json(
      {
        error: "All Groq API keys failed",
        reply:
          "The assistant is temporarily unavailable because all API keys hit their limits. Please try again later or contact the gym directly.",
      },
      { status: 503 },
    );
  } catch (err) {
    console.error("Chat route error", err);
    return NextResponse.json(
      {
        error: "Failed to process your message",
        reply:
          "Something went wrong while talking to the assistant. Please try again in a moment or contact the gym directly.",
      },
      { status: 500 },
    );
  }
}


