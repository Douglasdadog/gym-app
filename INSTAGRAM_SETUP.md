# Instagram DM Bot — How to Fix “IG Still Not Working”

Plain steps so the bot can reply to Instagram DMs. No coding needed.

---

## 1. Use the right token

The app can use **one token for both Facebook and Instagram** if your Page and IG are linked.

- **Option A:** Use only your **Page token**  
  - In Vercel (and `.env.local`), set `META_PAGE_ACCESS_TOKEN` to your **Facebook Page** access token.  
  - Leave `META_IG_ACCESS_TOKEN` empty — the app will use the Page token for Instagram too.
- **Option B:** Use a separate IG token  
  - Set `META_IG_ACCESS_TOKEN` to your Instagram token.  
  - The app will use that for IG; Page token stays for Messenger.

**Important:** After changing env vars in Vercel, redeploy (or wait for the next deploy). The app only sees new values after a new build.

---

## 2. Link Instagram to your Facebook Page

Instagram messaging only works if your **Instagram account is linked to your Facebook Page**.

1. Go to [Meta Business Suite](https://business.facebook.com).
2. Open **Settings** (gear icon).
3. Under **Accounts**, open **Instagram accounts**.
4. Link your Instagram (Business or Creator) account to the **same Page** you use for the bot.

If they’re not linked, Meta will return “No matching user” when the app tries to reply on Instagram.

---

## 3. Subscribe the webhook to Instagram

Your app receives events from Meta via a “webhook”. It must be subscribed to **Instagram** as well as **Page (Messenger)**.

1. Go to [developers.facebook.com](https://developers.facebook.com) → your app.
2. Open **Messenger** in the left menu → **Settings**.
3. In **Webhooks**, click **Add callback URL** (or edit the existing one).
   - Callback URL: `https://YOUR-VERCEL-DOMAIN.vercel.app/webhooks/messenger`
   - Verify token: same value as `META_VERIFY_TOKEN` in your env.
4. Click **Verify and Save**.
5. Under **Webhook fields**, click **Subscribe** and enable:
   - **Page** (for Messenger)
   - **Instagram** (for Instagram DMs)
6. For both, subscribe to at least **messages**.

Without subscribing to **Instagram**, the app never gets Instagram DM events.

---

## 4. Page token permissions

The token you use (Page or IG) must be allowed to manage Instagram messages.

1. In the same app, go to **App Review** or **Permissions and Features**.
2. Ensure **instagram_manage_messages** is requested and approved for your app.
3. When you generate the Page access token (in **Tools** → **Graph API Explorer** or Page settings), select the Page and include **instagram_manage_messages**.

Use this token in `META_PAGE_ACCESS_TOKEN` (and optionally `META_IG_ACCESS_TOKEN`).

---

## 5. 24-hour rule

Meta only allows replying to a user **within 24 hours** of their last message, unless you use an approved message tag (e.g. confirmation, update).

- If the user wrote days ago and you never replied, the app may get “No matching user” or a similar error.
- Have the user send a **new message**, then test again.

---

## 6. Quick checklist

- [ ] Page and Instagram account linked in Meta Business Suite.
- [ ] Webhook URL points to `https://YOUR-DOMAIN/webhooks/messenger` and verification passes.
- [ ] Webhook subscribed to **Instagram** (and **Page** for Messenger).
- [ ] `META_PAGE_ACCESS_TOKEN` set in Vercel (and optionally `META_IG_ACCESS_TOKEN`).
- [ ] Token has **instagram_manage_messages**.
- [ ] Redeployed after changing env vars.
- [ ] User sent a message in the last 24 hours before testing.

---

## Still not working?

Check Vercel **Logs** (or your server logs) when someone sends an Instagram DM. You should see either:

- `"Messenger webhook event"` with `"object": "instagram"` — then the app is receiving IG events.
- A warning about “No matching user” — then the problem is usually: Page/IG not linked, wrong token, or 24h window.

If you don’t see any log when someone messages on Instagram, the webhook isn’t subscribed to Instagram or the URL is wrong.
