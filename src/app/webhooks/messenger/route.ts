import { NextResponse } from "next/server";

// GET: Webhook verification (Meta sends hub.challenge here)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

// POST: Incoming Messenger events
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Right now we just acknowledge the event so Meta is happy.
    // You can later parse `body.entry` here and, when you have
    // name/email/phone/interest, call your /api/leads endpoint.
    console.log("Messenger webhook event", JSON.stringify(body, null, 2));
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("Messenger webhook error", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

