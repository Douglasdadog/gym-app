import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTierById, TIER_IDS } from "@/lib/tiers";

export const dynamic = "force-dynamic";

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
    const tier = body?.tier as string;
    const tierConfig = tier ? getTierById(tier) : null;
    if (!tier || !tierConfig || !TIER_IDS.includes(tier as (typeof TIER_IDS)[number])) {
      return NextResponse.json({ error: "Invalid tier. Use Basic, Elite, or VIP." }, { status: 400 });
    }

    const secret = process.env.PAYMONGO_SECRET_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    if (!secret?.startsWith("sk_")) {
      return NextResponse.json(
        { error: "Payment gateway not configured. Set PAYMONGO_SECRET_KEY." },
        { status: 503 }
      );
    }

    const amountCentavos = Math.round(tierConfig.price * 100); // PHP to centavos

    const res = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(secret + ":").toString("base64")}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            line_items: [
              {
                amount: amountCentavos,
                currency: "PHP",
                name: `Cyber-Gym ${tierConfig.name} Membership`,
                quantity: 1,
                description: tierConfig.perks.slice(0, 2).join(", "),
              },
            ],
            payment_method_types: ["card", "gcash", "paymaya", "grab_pay", "qrph"],
            success_url: `${baseUrl}/membership?success=1&tier=${encodeURIComponent(tier)}`,
            cancel_url: `${baseUrl}/membership`,
            description: `${tierConfig.name} membership — ${tierConfig.priceLabel}/mo (charged monthly)`,
            metadata: {
              user_id: user.id,
              tier,
              type: "membership",
            },
            send_email_receipt: true,
          },
        },
      }),
    });

    if (!res.ok) {
      const raw = await res.text();
      console.error("PayMongo create checkout error", res.status, raw);
      let detail = "Could not create checkout session. Try again.";
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
      data?: { attributes?: { checkout_url?: string } };
    };
    const checkoutUrl = data.data?.attributes?.checkout_url;
    if (!checkoutUrl) {
      return NextResponse.json({ error: "No checkout URL returned" }, { status: 502 });
    }

    return NextResponse.json({ checkout_url: checkoutUrl });
  } catch (e) {
    console.error("Create checkout error", e);
    return NextResponse.json({ error: "Payment service error" }, { status: 500 });
  }
}
