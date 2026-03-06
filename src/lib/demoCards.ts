export type DemoCard = {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  created_at: number;
};

const KEY = "cybergym_demo_cards_v1";

function safeParseCards(value: string | null): DemoCard[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is DemoCard => !!x && typeof x === "object")
      .map((x) => x as DemoCard)
      .filter((c) => typeof c.id === "string" && typeof c.last4 === "string");
  } catch {
    return [];
  }
}

export function loadDemoCards(): DemoCard[] {
  if (typeof window === "undefined") return [];
  const cards = safeParseCards(window.localStorage.getItem(KEY));
  return cards.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
}

export function saveDemoCards(cards: DemoCard[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(cards));
}

export function removeDemoCard(id: string) {
  const next = loadDemoCards().filter((c) => c.id !== id);
  saveDemoCards(next);
}

function detectBrand(pan: string): string {
  if (pan.startsWith("4")) return "Visa";
  if (/^5[1-5]/.test(pan)) return "Mastercard";
  if (/^3[47]/.test(pan)) return "AmEx";
  return "Card";
}

function isValidLuhn(pan: string): boolean {
  let sum = 0;
  let doubleIt = false;
  for (let i = pan.length - 1; i >= 0; i--) {
    const d = pan.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return false;
    let add = d;
    if (doubleIt) {
      add = d * 2;
      if (add > 9) add -= 9;
    }
    sum += add;
    doubleIt = !doubleIt;
  }
  return sum % 10 === 0;
}

export function addDemoCardFromInput(input: {
  cardNumber: string;
  expMonth: string;
  expYear: string;
}): { ok: true; card: DemoCard } | { ok: false; error: string } {
  const pan = input.cardNumber.replace(/\s/g, "");
  if (!/^\d{12,19}$/.test(pan)) return { ok: false, error: "Invalid card number." };
  if (!isValidLuhn(pan)) return { ok: false, error: "Invalid card number." };

  const expMonth = Number(input.expMonth);
  const expYear = Number(input.expYear);
  if (!Number.isFinite(expMonth) || expMonth < 1 || expMonth > 12) {
    return { ok: false, error: "Invalid expiry month." };
  }
  if (!Number.isFinite(expYear) || expYear < 2020 || expYear > 2100) {
    return { ok: false, error: "Invalid expiry year." };
  }

  const card: DemoCard = {
    id: `demo_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`,
    brand: detectBrand(pan),
    last4: pan.slice(-4),
    exp_month: expMonth,
    exp_year: expYear,
    created_at: Date.now(),
  };

  const cards = loadDemoCards();
  saveDemoCards([card, ...cards]);
  return { ok: true, card };
}

