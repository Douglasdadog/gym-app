/**
 * AI API Key Rotator - Groq & Grok (X.AI)
 * Handles 429 Rate Limit by switching to the next key automatically.
 */

const GROQ_API_BASE = "https://api.groq.com/openai/v1";
const GROK_API_BASE = "https://api.x.ai/v1";

export interface GrokMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GrokChatOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

function getGroqKeys(): string[] {
  return [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY_5,
  ].filter((k): k is string => Boolean(k?.trim()));
}

function getGrokKeys(): string[] {
  return [
    process.env.GROK_API_KEY_1,
    process.env.GROK_API_KEY_2,
    process.env.GROK_API_KEY_3,
    process.env.GROK_API_KEY_4,
    process.env.GROK_API_KEY_5,
  ].filter((k): k is string => Boolean(k?.trim()));
}

/**
 * Simple fallback parser when Grok API keys are not configured.
 * Uses common food estimates for basic inputs.
 */
function fallbackParseMeal(mealText: string): {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meal_description: string;
} {
  const lower = mealText.toLowerCase().trim();
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fats = 0;

  // Common foods: eggs (~70 cal, 6g P, 0.5g C, 5g F each)
  const eggMatch = lower.match(/(\d+)\s*(?:boiled\s*)?(?:egg|eggs)/) || (lower.includes("egg") ? ["1 egg", "1"] : null);
  if (eggMatch) {
    const n = parseInt(eggMatch[1], 10) || 1;
    calories += n * 70;
    protein += n * 6;
    carbs += n * 0.5;
    fats += n * 5;
  }

  // Rice (~200 cal, 4g P, 45g C, 0.5g F per cup)
  const riceMatch = lower.match(/(\d+)\s*(?:cup|cups?)\s*(?:of\s*)?rice/);
  if (riceMatch) {
    const n = parseInt(riceMatch[1], 10) || 1;
    calories += n * 200;
    protein += n * 4;
    carbs += n * 45;
    fats += n * 0.5;
  }

  // Chicken breast (~165 cal, 31g P, 0g C, 3.6g F per 100g)
  const chickenMatch = lower.match(/(\d+)\s*(?:g|gram|grams?)\s*(?:of\s*)?(?:chicken|breast)/);
  if (chickenMatch) {
    const g = parseInt(chickenMatch[1], 10) || 100;
    const mult = g / 100;
    calories += Math.round(165 * mult);
    protein += Math.round(31 * mult);
    fats += Math.round(3.6 * mult);
  }

  // Banana (~105 cal, 1.3g P, 27g C, 0.4g F each)
  const bananaMatch = lower.match(/(\d+)\s*bananas?/);
  if (bananaMatch) {
    const n = parseInt(bananaMatch[1], 10) || 1;
    calories += n * 105;
    protein += n * 1.3;
    carbs += n * 27;
    fats += n * 0.4;
  }

  // Oatmeal (~150 cal, 5g P, 27g C, 3g F per cup)

  // If nothing matched, use a generic estimate based on word count
  if (calories === 0 && protein === 0 && carbs === 0 && fats === 0) {
    const words = lower.split(/\s+/).filter(Boolean).length;
    calories = Math.max(100, words * 80);
    protein = Math.round(calories * 0.15 / 4);
    carbs = Math.round(calories * 0.5 / 4);
    fats = Math.round(calories * 0.35 / 9);
  }

  return {
    calories,
    protein,
    carbs,
    fats,
    meal_description: mealText,
  };
}

/**
 * Groq API with key rotation on 429. When one key hits rate limit, switches to the next.
 */
export async function groqChatWithRotation(
  messages: GrokMessage[],
  options: GrokChatOptions = {}
): Promise<{ content: string }> {
  const keys = getGroqKeys();
  if (keys.length === 0) throw new Error("No Groq API keys configured");
  const { model = "llama-3.3-70b-versatile", temperature = 0.3, max_tokens = 2048 } = options;
  let lastError: Error | null = null;

  for (let i = 0; i < keys.length; i++) {
    try {
      const res = await fetch(`${GROQ_API_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${keys[i]}`,
        },
        body: JSON.stringify({ model, messages, temperature, max_tokens }),
      });

      if (res.status === 429) {
        lastError = new Error(`Rate limited on key ${i + 1}`);
        continue;
      }
      if (!res.ok) throw new Error(`Groq API ${res.status}: ${await res.text()}`);

      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content ?? "";
      return { content };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (err instanceof Error && err.message.includes("429")) continue;
      throw lastError;
    }
  }
  throw lastError ?? new Error("All Groq keys rate limited");
}

/**
 * Grok API with key rotation on 429.
 */
export async function grokChatWithRotation(
  messages: GrokMessage[],
  options: GrokChatOptions = {}
): Promise<{ content: string; usage?: { prompt_tokens: number; completion_tokens: number } }> {
  const keys = getGrokKeys();
  if (keys.length === 0) throw new Error("No Grok API keys configured");
  const { model = "grok-3-mini", temperature = 0.3, max_tokens = 2048 } = options;
  let lastError: Error | null = null;

  for (let i = 0; i < keys.length; i++) {
    try {
      const res = await fetch(`${GROK_API_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${keys[i]}`,
        },
        body: JSON.stringify({ model, messages, temperature, max_tokens }),
      });

      if (res.status === 429) {
        lastError = new Error(`Rate limited on key ${i + 1}`);
        continue;
      }
      if (!res.ok) throw new Error(`Grok API ${res.status}: ${await res.text()}`);

      const data = (await res.json()) as {
        choices: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens: number; completion_tokens: number };
      };
      const content = data.choices?.[0]?.message?.content ?? "";
      return { content, usage: data.usage };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (err instanceof Error && err.message.includes("429")) continue;
      throw lastError;
    }
  }
  throw lastError ?? new Error("All Grok keys rate limited");
}

/**
 * Parse meal text into macros. Uses Groq first (if keys set), then Grok, then fallback.

 * Groq keys: GROQ_API_KEY_1 through GROQ_API_KEY_5. On 429 rate limit, auto-switches to next key.
 */
export async function parseMealToMacros(mealText: string): Promise<{
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  meal_description: string;
}> {
  const systemPrompt = `You are a nutrition expert. Parse the user's meal description into nutritional macros.
Return ONLY valid JSON with these exact keys (numbers only, no units):
{ "calories": number, "protein": number, "carbs": number, "fats": number, "meal_description": string }
Example: {"calories": 450, "protein": 25, "carbs": 35, "fats": 22, "meal_description": "3 eggs and 1 longganisa"}
Be accurate. If unsure, estimate reasonably. No markdown, no explanation, just JSON.`;

  const messages: GrokMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: mealText },
  ];

  let content: string | null = null;

  // Try Groq first (if keys configured)
  if (getGroqKeys().length > 0) {
    try {
      const out = await groqChatWithRotation(messages, { max_tokens: 256 });
      content = out.content;
    } catch {
      // Fall through to Grok or fallback
    }
  }

  // Try Grok if Groq failed or not configured
  if (!content && getGrokKeys().length > 0) {
    try {
      const out = await grokChatWithRotation(messages, { max_tokens: 256 });
      content = out.content;
    } catch {
      // Fall through to fallback
    }
  }

  // Use local fallback when no content (no keys or both APIs failed)
  if (!content) {
    return fallbackParseMeal(mealText);
  }

  const cleaned = content.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
  const parsed = JSON.parse(cleaned) as {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    meal_description: string;
  };

  return {
    calories: Number(parsed.calories) || 0,
    protein: Number(parsed.protein) || 0,
    carbs: Number(parsed.carbs) || 0,
    fats: Number(parsed.fats) || 0,
    meal_description: String(parsed.meal_description || mealText),
  };
}
