# Supabase Setup Guide for Cyber-Gym

Follow these steps to get Supabase running for your project.

---

## Step 1: Create a Supabase Account & Project

1. Go to **[supabase.com](https://supabase.com)** and sign up (or log in with GitHub).
2. Click **"New Project"**.
3. Fill in:
   - **Name:** `cyber-gym` (or any name you like)
   - **Database Password:** Choose a strong password and **save it somewhere** (you’ll need it for direct DB access).
   - **Region:** Pick the closest region to you.
4. Click **"Create new project"** and wait 1–2 minutes for it to spin up.

---

## Step 2: Get Your API Keys

1. In the Supabase dashboard, open your project.
2. Go to **Settings** (gear icon in the left sidebar) → **API**.
3. You’ll see:
   - **Project URL** (e.g. `https://xxxxxxxx.supabase.co`)
   - **anon public** key (safe for client-side)
   - **service_role** key (secret, server-side only)

4. Copy these values.

---

## Step 3: Add Keys to Your Project

1. Open `C:\Users\Douglas\Desktop\projects\cyber-gym\.env.local`.
2. Replace the placeholders with your real values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

*(Use your actual Project URL and keys from Step 2.)*

---

## Step 4: Run the Database Migrations

1. In Supabase, go to **SQL Editor** (in the left sidebar).
2. Click **"New query"**.

### Migration 1: Initial schema

3. Open `supabase/migrations/001_initial_schema.sql` in your project.
4. Copy its full contents and paste into the SQL Editor.
5. Click **"Run"** (or press Ctrl+Enter).
6. You should see: `Success. No rows returned`.

### Migration 2: Auth profile trigger

7. Click **"New query"** again.
8. Copy the contents of `supabase/migrations/002_auth_profile_trigger.sql`.
9. Paste and click **"Run"**.

### Migration 3: Sample trainers (optional)

10. If you have `003_trainers_with_photos.sql`, run it the same way.  
    *(Skip if you already ran 001 with trainers.)*

### Migration 4: Demo accounts

11. Click **"New query"** again.
12. Copy the contents of `supabase/migrations/004_seed_sample_accounts.sql`.
13. Paste and click **"Run"**.

---

## Step 5: Enable Realtime for Gym Occupancy

1. Go to **Database** → **Replication** (in the left sidebar).
2. Find the **supabase_realtime** publication.
3. Make sure **`gym_status`** is enabled (toggle on if it’s off).

---

## Step 6: Configure Auth (for Sign Up to work)

1. Go to **Authentication** → **Providers** → **Email**.
2. **Turn off "Confirm email"** for development so new users can sign in immediately after signing up (no verification email needed).
3. **Re-enable it for production** for security.
4. The demo accounts (user/admin) are for testing only. Real users sign up with their own email.

---

## Step 7: Test Your Setup

1. In your project folder, run:

```powershell
cd C:\Users\Douglas\Desktop\projects\cyber-gym
npm run dev
```

2. Open **http://localhost:3000** (or 3001/3002 if 3000 is in use).
3. Go to **Sign In**.
4. Log in with:
   - **Username:** `user`
   - **Password:** `user123`

If you can sign in and see the dashboard, Supabase is set up correctly.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Invalid API key" | Check that `.env.local` has the correct URL and anon key. Restart `npm run dev`. |
| "relation does not exist" | Run the migrations again in order (001 → 002 → 004). |
| Sign in fails | Run `004_seed_sample_accounts.sql` to create demo accounts. |
| Realtime not updating | Enable `gym_status` in Database → Replication. |
| CORS errors | Supabase handles CORS; ensure your URL is correct and you’re not mixing HTTP/HTTPS. |

---

## Quick Reference: File Locations

- Migrations: `cyber-gym/supabase/migrations/`
- Env file: `cyber-gym/.env.local`
- Env example: `cyber-gym/.env.example`
