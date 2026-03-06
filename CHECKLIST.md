# Cyber-Gym — Feature Checklist

**System vision:** Social Sales Agent Bots (FB, IG & TikTok) + CRM + Landing Page + Booking Platform/App + Calendar/Schedule Manager + Payment Gateway

---

## 1. Social Sales Agent Bots (FB, IG & TikTok)

| Channel | Status | Notes |
|--------|--------|--------|
| **Facebook Messenger** | ✅ Yes (live, lead‑capturing) | Webhook + Apex Assistant, leads saved to CRM |
| **Instagram DM** | ⚠️ Partially | Same webhook; needs Page linked to IG + token with `instagram_manage_messages` for full replies |
| **TikTok** | ⬜ Not yet | To be added when needed (TikTok for Developers / Messaging API) |

---

## 2. CRM

- **Central leads table** + **Admin Leads page** (`/admin/leads`).
- **View & filter** by source (e.g. Messenger), and see **name, email, phone, interest**.
- Lead status (New / Contacted / Won / Lost), notes, tasks/reminders, assign to staff.

---

## 3. Landing Page

- ✅ **Yes.** Modern landing for Cyber‑Gym with hero, features, CTAs.
- **Support Chat widget** hooked in for lead capture and questions.

---

## 4. Booking Platform / App

- ✅ **Yes (core flows).**
  - Trainer list with profiles & PHP pricing.
  - Booking form: gym/home, travel fee, total session cost; stored in `bookings`.
  - User dashboard shows **next PT session**; admin has **trainer payouts** view.
- ⬜ **Not yet:** payments or automatic cancellation fees.

---

## 5. Calendar / Schedule Manager

- ⚠️ **Partially.** Users pick **date + time slots** when booking; bookings are stored with **date + time**. Admin Schedule page shows month view and bookings by date/trainer. Full calendar automation (e.g. reminders, sync) can be extended later.

---

## 6. Payment Gateway

- ✅ **PayMongo** (Philippines). Membership checkout: card, GCash, PayMaya, GrabPay, QR Ph.
  - **Create checkout** → redirect to PayMongo → **webhook** fulfills membership (profile + `memberships` row).
  - If `PAYMONGO_SECRET_KEY` is not set, membership page falls back to direct purchase (no payment) for testing.
  - See **PAYMONGO_SETUP.md** for keys and webhook URL.

---

## 7. Other Implemented Features

- Auth (sign up / login with **email or username**).
- Membership tiers (Basic, Elite, VIP).
- Admin: Member list, **Freeze**, **Unfreeze**, Remove.
- Live gym occupancy (check‑in/out, real‑time gauge).
- AI nutrition coach (Grok, log meals).
- User dashboard (occupancy, next PT, macros, membership).
- Demo accounts (user / admin).

---

## Quick reference

- **Redeploy:** Push to `main` → Vercel auto-deploys.
- **Env:** Copy `.env.example` → `.env.local`; set Supabase, Groq, and Meta tokens.
- **Webhook URL (Meta):** `https://<your-vercel-domain>/webhooks/messenger` (FB + IG use same URL).
