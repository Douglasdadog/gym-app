import { NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export async function POST(request: Request) {
  const keys = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY_5,
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
    const incoming = body?.messages as
      | { role: "user" | "assistant"; content: string }[]
      | undefined;

    if (!incoming || !Array.isArray(incoming) || incoming.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 },
      );
    }

    const systemPrompt =
      "You are Cyber-Gym's virtual front-desk assistant for a modern, tech-forward gym in Lagos. " +
      "Answer questions about memberships, pricing ranges, opening hours, personal training (in-gym and home sessions), nutrition features, and how the Cyber-Gym app works. " +
      "Memberships: Basic = gym access, equipment, locker rooms. Elite = Basic + sauna, group classes, priority booking. VIP = Elite + home PT priority, unlimited AI coaching, dedicated support. " +
      "Your goals: give clear, short, friendly answers AND gently collect lead info when someone seems interested. " +
      "When a user shows interest in joining, booking a trainer, or getting a tailored plan, politely ask for their name, email, and phone number, and what they are interested in (membership tier, PT, home sessions, nutrition coaching). " +
      "Only ask for contact details once per conversation, and do it in a natural way that fits the flow. " +
      "If the user asks about something you do not know (like exact prices, addresses, or specific trainer availability), give your best generic answer and clearly say they should confirm details with the gym. " +
      "Keep replies short, friendly, and easy to scan. Do not give medical advice; instead, suggest speaking with a doctor or qualified professional.";

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


