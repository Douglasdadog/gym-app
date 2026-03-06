import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Attach a payment method (created on the client with public key) to the setup Payment Intent.
 * Returns redirect_url if 3DS is required; otherwise the card is saved.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { payment_intent_id, payment_method_id, client_key, return_url } = body;
    if (!payment_intent_id || !payment_method_id || !client_key) {
      return NextResponse.json(
        { error: "Missing payment_intent_id, payment_method_id, or client_key." },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const redirectUrl = return_url || `${baseUrl}/dashboard/payment-methods?setup=success`;

    const publicKey = process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY;
    if (!publicKey?.startsWith("pk_")) {
      return NextResponse.json(
        { error: "Payment gateway public key not configured." },
        { status: 503 }
      );
    }

    const res = await fetch(
      `https://api.paymongo.com/v1/payment_intents/${payment_intent_id}/attach`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(publicKey + ":").toString("base64")}`,
        },
        body: JSON.stringify({
          data: {
            attributes: {
              payment_method: payment_method_id,
              client_key,
              return_url: redirectUrl,
            },
          },
        }),
      }
    );

    const data = await res.json().catch(() => ({})) as {
      data?: {
        attributes?: {
          status?: string;
          next_action?: { redirect_url?: string };
        };
      };
      error?: { message?: string };
    };

    if (!res.ok) {
      console.error("PayMongo attach error", res.status, data);
      return NextResponse.json(
        { error: (data as { error?: { message?: string } }).error?.message || "Could not save card." },
        { status: 502 }
      );
    }

    const status = data.data?.attributes?.status;
    const redirectUrlOut = data.data?.attributes?.next_action?.redirect_url;

    if (redirectUrlOut) {
      return NextResponse.json({ redirect_url: redirectUrlOut, status: "requires_action" });
    }
    if (status === "succeeded") {
      return NextResponse.json({ status: "succeeded", message: "Card saved successfully." });
    }

    return NextResponse.json({ status: status ?? "pending", redirect_url: redirectUrlOut });
  } catch (e) {
    console.error("Attach setup error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
