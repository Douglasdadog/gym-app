import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * Get or create PayMongo customer for the current user. Required before saving a card.
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
      .select("paymongo_customer_id, full_name, email")
      .eq("id", user.id)
      .single();

    if (profile?.paymongo_customer_id) {
      return NextResponse.json({ customer_id: profile.paymongo_customer_id });
    }

    const name = (profile?.full_name ?? "").trim() || "Customer";
    const parts = name.split(/\s+/);
    const firstName = parts[0] ?? "Customer";
    const lastName = parts.slice(1).join(" ") || ".";
    const email = (profile?.email ?? user.email ?? "").trim() || "customer@cybergym.ph";

    const res = await fetch("https://api.paymongo.com/v1/customers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(secret + ":").toString("base64")}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            first_name: firstName.slice(0, 255),
            last_name: lastName.slice(0, 255),
            email,
            default_device: "email",
            metadata: { user_id: user.id },
          },
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("PayMongo create customer error", res.status, errText);
      return NextResponse.json(
        { error: "Could not create payment profile." },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { data?: { id?: string } };
    const customerId = data.data?.id;
    if (!customerId) {
      return NextResponse.json({ error: "Invalid customer response" }, { status: 502 });
    }

    await admin
      .from("profiles")
      .update({ paymongo_customer_id: customerId })
      .eq("id", user.id);

    return NextResponse.json({ customer_id: customerId });
  } catch (e) {
    console.error("Payment customer error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
