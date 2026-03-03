# Cyber-Gym

Dark-themed, high-end fitness dashboard with AI nutrition coaching, live gym occupancy, and PT booking.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, Framer Motion, Lucide Icons
- **Backend:** Supabase (Auth, PostgreSQL, Real-time)
- **AI:** Grok AI (X.AI) with 5-key rotation for rate limit resilience

## Setup

> **New to Supabase?** See [SETUP_SUPABASE.md](./SETUP_SUPABASE.md) for a step-by-step guide.

### 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

GROK_API_KEY_1=your-grok-api-key-1
GROK_API_KEY_2=your-grok-api-key-2
GROK_API_KEY_3=your-grok-api-key-3
GROK_API_KEY_4=your-grok-api-key-4
GROK_API_KEY_5=your-grok-api-key-5
```

### 2. Database Migration

In Supabase Dashboard → SQL Editor, run the migrations in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_auth_profile_trigger.sql`
3. `supabase/migrations/004_seed_sample_accounts.sql` (creates demo user & admin)

Or use Supabase CLI: `supabase db push`

### 3. Enable Realtime

In Supabase Dashboard → Database → Replication, ensure `gym_status` is enabled for real-time.

### 4. Run

```bash
npm install
npm run dev
```

## Demo Accounts

After running migrations, use these sample accounts:

| Role | Username | Password |
|------|----------|----------|
| User | `user` | `user123` |
| Admin | `admin` | `admin123` |

## Features

- **Live Gym Occupancy** – Real-time heat gauge with check-in/check-out
- **AI Nutrition Coach** – Type meals (e.g. "3 eggs and 1 longganisa"), Grok parses macros and saves to `nutrition_logs`
- **PT Booking** – Gym or Home-based sessions with dynamic travel fee
- **Membership Tiers** – Basic, Elite, VIP (Fitness First style)
- **Bento Grid Dashboard** – Occupancy, Next PT, Daily Macros, Membership, Nutrition, Bookings

## Grok Key Rotator

The `src/lib/grok/rotator.ts` utility rotates through 5 API keys. On 429 (Rate Limit), it automatically switches to the next key and retries once.
