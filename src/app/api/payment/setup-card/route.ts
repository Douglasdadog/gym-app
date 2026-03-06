import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * Create a Payment Intent for ₱1 to save the customer's card (setup_future_usage).
 * Returns client_key and payment_intent_id for the frontend to attach a payment method.
 */
export async function POST(request: NextRequest) {
  try {
    void request;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = process.env.PAYMONGO_SECRET_KEY;
    if (!secret?.startsWith("sk_")) {
      return NextResponse.json(
        { error: "Payment gateway not configured." },
        { status: 503 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
    const admin = createServiceClient(supabaseUrl, serviceKey);

    const { data: profile } = await admin
      .from("profiles")
      .select("paymongo_customer_id")
      .eq("id", user.id)
      .single();

    const customerId = profile?.paymongo_customer_id;
    if (!customerId) {
      return NextResponse.json(
        { error: "Create a payment profile first. Call POST /api/payment/customer." },
        { status: 400 }
      );
    }

    const res = await fetch("https://api.paymongo.com/v1/payment_intents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(secret + ":").toString("base64")}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: 2000, // PayMongo minimum ₱20; used as verification to save card
            currency: "PHP",
            payment_method_allowed: ["card"],
            description: "Save your card for Cyber-Gym",
            setup_future_usage: {
              session_type: "on_session",
              customer_id: customerId,
            },
            metadata: {
              user_id: user.id,
              type: "setup_card",
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const raw = await res.text();
      console.error("PayMongo setup payment intent error", res.status, raw);
      let detail = "Could not start card setup.";
      try {
        const parsed = JSON.parse(raw) as {
          errors?: Array<{ detail?: string }>;
          error?: { message?: string };
          message?: string;
        };
        detail =
          parsed.errors?.[0]?.detail ||
          parsed.error?.message ||
          parsed.message ||
          detail;
      } catch {
        // keep fallback detail
      }
      return NextResponse.json(
        { error: `PayMongo: ${detail}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      data?: { id?: string; attributes?: { client_key?: string } };
    };
    const paymentIntentId = data.data?.id;
    const clientKey = data.data?.attributes?.client_key;
    if (!paymentIntentId || !clientKey) {
      return NextResponse.json({ error: "Invalid setup response" }, { status: 502 });
    }

    return NextResponse.json({
      payment_intent_id: paymentIntentId,
      client_key: clientKey,
    });
  } catch (e) {
    console.error("Setup card error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
