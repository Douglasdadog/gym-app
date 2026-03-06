# PayMongo Payment Gateway Setup

Cyber-Gym uses **PayMongo** for membership payments (PHP). Supports card, GCash, PayMaya, GrabPay, QR Ph, and more.

## 1. PayMongo account

1. Sign up at [dashboard.paymongo.com](https://dashboard.paymongo.com/).
2. Get your **Secret key** (starts with `sk_test_` for test, `sk_live_` for production) from the dashboard.
3. Add it in Vercel (and `.env.local` for local dev):
   - `PAYMONGO_SECRET_KEY=sk_test_xxxx`

## 2. App URL (success/cancel redirects)

Set your app’s base URL so PayMongo can redirect after payment:

- **Vercel:** `NEXT_PUBLIC_APP_URL=https://gym-app-eight-psi.vercel.app`
- **Local:** `NEXT_PUBLIC_APP_URL=http://localhost:3000`

## 3. Webhook (fulfill membership after payment)

PayMongo must call your app when a payment succeeds so the membership can be activated.

1. In PayMongo Dashboard → **Webhooks** → **Create webhook**.
2. **URL:** `https://gym-app-eight-psi.vercel.app/api/webhooks/paymongo`
3. **Events:** Subscribe to **`checkout_session.payment.paid`** (and optionally `payment.paid`).
4. Save. PayMongo will show a **Webhook secret** (`whsk_...`). You can use it later to [verify webhook signatures](https://developers.paymongo.com/docs/webhook-implementation-best-practices) (optional).

## 4. Flow

- User clicks **Get Basic/Elite/VIP** on the Membership page (or changes plan).
- App calls `POST /api/payment/create-checkout` with `{ tier: "Basic" | "Elite" | "VIP" }`.
- Backend creates a PayMongo Checkout Session (amount in PHP, metadata: `user_id`, `tier`, `type: "membership"`) and returns `checkout_url`.
- User is redirected to PayMongo to pay (card, GCash, etc.).
- On success, PayMongo redirects to `/membership?success=1&tier=Basic` and sends a webhook to `/api/webhooks/paymongo`.
- Webhook handler updates `profiles.membership_tier` and inserts a row into `memberships`. Subscriptions are sold as one month; for automatic monthly renewal you can add PayMongo Subscriptions later.

## 5. Saved payment methods (card only)

Customers can add and save a card from **Dashboard → Payment** so it can be used for future payments (e.g. subscriptions, bookings).

1. **Enable Card Vaulting** in your PayMongo dashboard if required (see [PayMongo Card Vaulting](https://developers.paymongo.com/docs/card-vaulting-1)).
2. Set **`NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY`** (starts with `pk_test_` or `pk_live_`) in Vercel and `.env.local`. Get it from the same PayMongo dashboard as the secret key.
3. Run the migration that adds `paymongo_customer_id` to `profiles` (e.g. `016_add_paymongo_customer_id.sql`).
4. Flow: User goes to **Dashboard → Payment** → **Add card**. A one-time ₱20 verification charge may apply. Card details are sent only to PayMongo (not your server). After success, the card is vaulted to the customer and can be used for later charges.

**GCash / PayMaya:** E-wallets are not saved for automatic charging; they can be used each time at checkout.

## 6. No payment gateway configured

If `PAYMONGO_SECRET_KEY` is not set (or doesn’t start with `sk_`), the app returns 503 and the Membership page **falls back to direct purchase** (updates profile + membership in DB without payment). Use this for local testing without PayMongo.
