import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const { trainer_id, date, time_slot, location_type, address, travel_fee } = body;
    if (!trainer_id || !date || !time_slot) {
      return NextResponse.json(
        { error: "Missing required fields: trainer_id, date, time_slot" },
        { status: 400 }
      );
    }

    const { data: trainer } = await supabase
      .from("trainers")
      .select("id, name, hourly_rate_gym, hourly_rate_home")
      .eq("id", trainer_id)
      .single();

    if (!trainer) {
      return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
    }

    const isHome = location_type === "Home";
    const sessionAmount =
      (isHome ? Number(trainer.hourly_rate_home) : Number(trainer.hourly_rate_gym)) || 0;
    const travel = Number(travel_fee) || 0;
    const totalPHP = sessionAmount + travel;
    const amountCentavos = Math.round(totalPHP * 100);
    if (amountCentavos < 2000) {
      return NextResponse.json({ error: "Minimum payment is ₱20. Check trainer rates." }, { status: 400 });
    }

    const secret = process.env.PAYMONGO_SECRET_KEY;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    if (!secret?.startsWith("sk_")) {
      return NextResponse.json(
        { error: "Payment gateway not configured. Set PAYMONGO_SECRET_KEY." },
        { status: 503 }
      );
    }

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
                name: `PT Session with ${trainer.name}`,
                quantity: 1,
                description: `${date} at ${time_slot} · ${isHome ? "Home" : "Gym"}${travel > 0 ? ` (incl. ₱${travel} travel)` : ""}`,
              },
            ],
            payment_method_types: ["card", "gcash", "paymaya", "grab_pay", "qrph"],
            success_url: `${baseUrl}/bookings?payment=success&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time_slot)}&trainer=${encodeURIComponent(trainer.name)}`,
            cancel_url: `${baseUrl}/bookings`,
            description: `Personal training — ${trainer.name}`,
            metadata: {
              user_id: user.id,
              trainer_id: String(trainer_id),
              date: String(date),
              time_slot: String(time_slot),
              location_type: isHome ? "Home" : "Gym",
              address: address ? String(address).slice(0, 500) : "",
              travel_fee: String(travel),
              type: "booking",
            },
            send_email_receipt: true,
          },
        },
      }),
    });

    if (!res.ok) {
      const raw = await res.text();
      console.error("PayMongo booking checkout error", res.status, raw);
      let detail = "Could not create checkout. Try again.";
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
    console.error("Create booking checkout error", e);
    return NextResponse.json({ error: "Payment service error" }, { status: 500 });
  }
}
