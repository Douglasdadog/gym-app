# Cyber-Gym — Feature Checklist

**System vision:** Social Sales Agent Bots (FB, IG & TikTok) + CRM + Landing Page + Booking Platform/App + Calendar/Schedule Manager + Payment Gateway

---

## 1. Social Sales Agent Bots

| Feature | Status | Notes |
|--------|--------|--------|
| **Facebook Messenger** bot | ✅ Done | Webhook at `/webhooks/messenger`, Apex Assistant (Groq), lead capture to CRM |
| **Instagram** DM bot | ✅ Done | Same webhook (`object: "instagram"`), uses `META_IG_ACCESS_TOKEN` for replies |
| **TikTok** bot | ⬜ Not yet | No webhook or integration; would need TikTok for Developers / Messaging API |

---

## 2. CRM (Leads)

| Feature | Status | Notes |
|--------|--------|--------|
| Leads list (Admin) | ✅ Done | `/admin/leads` — from chatbot + Messenger/IG |
| Lead status (New / Contacted / Won / Lost) | ✅ Done | Dropdown per lead |
| Notes per lead | ✅ Done | Modal with spacious textarea, Save/Cancel |
| Tasks & reminders per lead | ✅ Done | Add task, due date, mark complete, delete |
| Assign to staff | ✅ Done | Assignee dropdown (admin users) |
| Filter by source (e.g. Messenger) | ✅ Done | Filter dropdown |
| Filter by status | ✅ Done | Status filter |

---

## 3. Landing Page

| Feature | Status | Notes |
|--------|--------|--------|
| Hero + value proposition | ✅ Done | `/` (home) — dark theme, CTAs |
| Features / perks (tiers, PT, etc.) | ✅ Done | Section with icons |
| CTA to sign up / book | ✅ Done | Auth and Bookings links |
| Mobile-friendly | ✅ Done | Responsive layout |

---

## 4. Booking Platform / App

| Feature | Status | Notes |
|--------|--------|--------|
| PT session booking | ✅ Done | `/bookings` — trainer, date, time slot |
| Gym vs Home (with travel fee) | ✅ Done | Location type + dynamic travel fee |
| Member’s booking history | ✅ Done | List on bookings page |
| Cancel booking | ✅ Done | From dashboard “Next PT” and bookings |
| Add to Google Calendar | ✅ Done | Link after confirm |
| Trainer availability (admin) | ✅ Done | Admin trainers page + today’s sessions |

---

## 5. Calendar / Schedule Manager

| Feature | Status | Notes |
|--------|--------|--------|
| Admin calendar view | ✅ Done | `/admin/schedule` — month view |
| View bookings by date | ✅ Done | Click day → list of bookings |
| Filter by trainer | ✅ Done | Trainer dropdown on schedule page |
| Navigate months | ✅ Done | Prev/Next month |

---

## 6. Payment Gateway

| Feature | Status | Notes |
|--------|--------|--------|
| Payment integration | ⬜ Not yet | No Stripe, PayMongo, or other gateway yet |
| Pay for membership / upgrades | ⬜ Not yet | Tiers shown; no checkout flow |
| Pay for PT / bookings | ⬜ Not yet | Booking is free; no payment step |

*Suggested:* Integrate PayMongo or Stripe for Philippines (PHP) — membership checkout and/or PT session payments.

---

## 7. Other Implemented Features

| Feature | Status |
|--------|--------|
| Auth (sign up / login with email or username) | ✅ |
| Membership tiers (Basic, Elite, VIP) | ✅ |
| Admin: Member list, Freeze, **Unfreeze**, Remove | ✅ |
| Live gym occupancy (check-in/out, real-time gauge) | ✅ |
| AI nutrition coach (Grok, log meals) | ✅ |
| User dashboard (occupancy, next PT, macros, membership) | ✅ |
| Demo accounts (user / admin) | ✅ |

---

## Quick reference

- **Redeploy:** Push to `main` → Vercel auto-deploys.
- **Env:** Copy `.env.example` → `.env.local`; set Supabase, Grok, and Meta tokens (including `META_IG_ACCESS_TOKEN` for IG replies).
- **Webhook URL (Meta):** `https://<your-vercel-domain>/webhooks/messenger` (FB + IG use same URL).
