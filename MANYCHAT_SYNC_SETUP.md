# ManyChat -> Cyber-Gym Inbox Sync

Use this to make IG messages from ManyChat appear in your web admin inbox (`/admin/inbox`).

## 1) Set environment variable (Vercel)

Add this in Vercel Project Settings -> Environment Variables:

- `MANYCHAT_WEBHOOK_SECRET` = a long random string

Example:

`MANYCHAT_WEBHOOK_SECRET=mcps_ppmp_very_long_secret_2026`

Redeploy after adding.

## 2) ManyChat external request (for inbound IG user message)

In your ManyChat flow, add an **External Request** action:

- Method: `POST`
- URL: `https://mcps-ppmp.site/api/integrations/manychat/messages`
- Headers:
  - `Content-Type: application/json`
  - `x-manychat-secret: <same value as MANYCHAT_WEBHOOK_SECRET>`
- Body (JSON):

```json
{
  "channel": "instagram",
  "sender_id": "{{user.id}}",
  "sender_name": "{{user.first_name}} {{user.last_name}}",
  "direction": "inbound",
  "text": "{{last_text_input}}",
  "created_at": "{{system.current_time}}"
}
```

## 3) ManyChat external request (for bot outbound message)

After your bot sends a message, add another External Request action:

- Method: `POST`
- URL: `https://mcps-ppmp.site/api/integrations/manychat/messages`
- Headers:
  - `Content-Type: application/json`
  - `x-manychat-secret: <same value as MANYCHAT_WEBHOOK_SECRET>`
- Body (JSON):

```json
{
  "channel": "instagram",
  "sender_id": "{{user.id}}",
  "sender_name": "{{user.first_name}} {{user.last_name}}",
  "direction": "outbound",
  "text": "YOUR_BOT_MESSAGE_TEXT",
  "created_at": "{{system.current_time}}"
}
```

Notes:
- `direction = inbound` is stored as `role = user`.
- `direction = outbound` is stored as `role = assistant`.

## 4) Verify in website inbox

Open:

- `https://mcps-ppmp.site/admin/inbox`

You should now see Instagram threads and messages from ManyChat.

