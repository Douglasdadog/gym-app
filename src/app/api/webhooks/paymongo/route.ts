import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getTierById, TIER_IDS } from "@/lib/tiers";

export const dynamic = "force-dynamic";

type PayMongoEvent = {
  data?: {
    id?: string;
    type?: string;
    attributes?: {
      type?: string;
      data?: {
        id?: string;
        type?: string;
        attributes?: {
          metadata?: Record<string, string>;
          payment_intent?: {
            attributes?: { metadata?: Record<string, string> };
          };
        };
      };
    };
  };
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PayMongoEvent;
    const eventType = body.data?.attributes?.type;

    const isCheckoutEvent =
      eventType === "checkout_session.payment.paid" || eventType === "checkout_session.completed";
    if (!isCheckoutEvent && eventType !== "payment.paid") {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    let metadata: Record<string, string> | undefined;

    if (isCheckoutEvent) {
      metadata = body.data?.attributes?.data?.attributes?.metadata;
    }
    if (!metadata && eventType === "payment.paid") {
      const paymentIntentId = body.data?.attributes?.data?.attributes?.payment_intent?.attributes?.metadata;
      metadata = paymentIntentId as unknown as Record<string, string>;
    }
    if (!metadata) {
      const inner = body.data?.attributes?.data?.attributes;
      metadata = inner?.metadata ?? inner?.payment_intent?.attributes?.metadata;
    }

    const type = metadata?.type ?? "membership";

    if (type === "setup_card") {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (type === "booking") {
      const userId = metadata?.user_id;
      const trainerId = metadata?.trainer_id;
      const date = metadata?.date;
      const timeSlot = metadata?.time_slot;
      const locationType = metadata?.location_type ?? "Gym";
      const address = metadata?.address ?? null;
      const travelFee = Number(metadata?.travel_fee ?? 0) || 0;

      if (!userId || !trainerId || !date || !timeSlot) {
        console.warn("PayMongo webhook: booking missing required metadata");
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !serviceKey) {
        console.error("PayMongo webhook: missing Supabase env");
        return NextResponse.json({ error: "Server config error" }, { status: 500 });
      }
      const supabase = createServiceClient(supabaseUrl, serviceKey);

      const { error } = await supabase.from("bookings").insert({
        user_id: userId,
        trainer_id: trainerId,
        date,
        time_slot: timeSlot,
        location_type: locationType,
        address: address || null,
        travel_fee: travelFee,
        status: "confirmed",
      });
      if (error) console.error("PayMongo webhook: booking insert error", error);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const userId = metadata?.user_id;
    const tier = metadata?.tier;

    if (!userId || !tier || !TIER_IDS.includes(tier as (typeof TIER_IDS)[number])) {
      console.warn("PayMongo webhook: missing or invalid user_id/tier in metadata", { userId, tier });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      console.error("PayMongo webhook: missing Supabase env");
      return NextResponse.json({ error: "Server config error" }, { status: 500 });
    }

    const supabase = createServiceClient(supabaseUrl, serviceKey);
    const tierConfig = getTierById(tier);
    const price = tierConfig?.price ?? 0;
    const perks = tierConfig?.perks ?? [];

    await supabase.from("profiles").update({ membership_tier: tier }).eq("id", userId);

    await supabase.from("memberships").insert({
      user_id: userId,
      type: tier,
      price,
      perks,
      status: "active",
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (e) {
    console.error("PayMongo webhook error", e);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
