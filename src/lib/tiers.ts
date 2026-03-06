/**
 * Single source of truth for membership tiers and pricing (PHP).
 * Used by: membership page, payment checkout, webhook, bot prompts.
 * High-end gym pricing (Anytime Fitness–style, Philippines).
 */

export const MEMBERSHIP_TIERS = [
  {
    id: "Basic",
    name: "Basic",
    price: 2499,
    priceLabel: "₱2,499",
    desc: "Gym Access",
    perks: ["24/7 gym access", "Equipment use", "Locker rooms"],
  },
  {
    id: "Elite",
    name: "Elite",
    price: 3999,
    priceLabel: "₱3,999",
    desc: "Gym + More",
    perks: ["Everything in Basic", "Sauna access", "Group classes", "Priority booking"],
    highlight: true,
  },
  {
    id: "VIP",
    name: "VIP",
    price: 5499,
    priceLabel: "₱5,499",
    desc: "All-Access",
    perks: ["Everything in Elite", "Home PT priority", "Unlimited AI coaching", "Dedicated support"],
  },
] as const;

export const TIER_IDS = ["Basic", "Elite", "VIP"] as const;
export type TierId = (typeof TIER_IDS)[number];

export function getTierById(id: string) {
  return MEMBERSHIP_TIERS.find((t) => t.id === id);
}

/** Short summary for bot: "Basic ₱2,499/mo, Elite ₱3,999/mo, VIP ₱5,499/mo. All in PHP, charged monthly." */
export const BOT_TIER_SUMMARY =
  "Membership tiers: Basic ₱2,499/month, Elite ₱3,999/month, VIP ₱5,499/month. Subscriptions are charged monthly. All prices in Philippine Peso (PHP).";
