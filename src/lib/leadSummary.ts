const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

export type LeadSummaryMessage = { role: string; content: string };

/**
 * Use AI to infer lead interest and a short conversation summary (notes) from the chat.
 * Falls back to "Not specified" / "Captured via conversation." if the call fails.
 */
export async function summarizeConversationForLead(
  messages: LeadSummaryMessage[]
): Promise<{ interest: string; notes: string }> {
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
    return { interest: "Not specified", notes: "Captured via conversation." };
  }

  const convoText = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const systemPrompt =
    "You are a CRM assistant. Given a conversation between a potential gym member and a gym assistant, output a JSON object with exactly two keys: " +
    '"interest" (one short phrase: e.g. membership, personal training, gym tour, 3-day trial, home session; if unclear use "Not specified") and ' +
    '"notes" (1-3 sentences summarizing the conversation for staff: key topics, what they want, next steps). Reply with only valid JSON, no other text or markdown.';

  const userPrompt = `Conversation:\n${convoText.slice(-3000)}\n\nOutput JSON with keys "interest" and "notes":`;

  for (const key of keys) {
    try {
      const res = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: false,
        }),
      });

      if (!res.ok) continue;

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = data.choices?.[0]?.message?.content?.trim();
      if (!raw) continue;

      let jsonStr = raw;
      const codeMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeMatch) jsonStr = codeMatch[1].trim();
      const parsed = JSON.parse(jsonStr) as { interest?: string; notes?: string };
      const interest =
        typeof parsed.interest === "string" && parsed.interest.trim()
          ? parsed.interest.trim().slice(0, 200)
          : "Not specified";
      const notes =
        typeof parsed.notes === "string" && parsed.notes.trim()
          ? parsed.notes.trim().slice(0, 1000)
          : "Captured via conversation.";

      return { interest, notes };
    } catch {
      continue;
    }
  }

  return { interest: "Not specified", notes: "Captured via conversation." };
}
