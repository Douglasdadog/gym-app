import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function parsePayMongoDetail(raw: string, fallback: string) {
  try {
    const parsed = JSON.parse(raw) as {
      errors?: Array<{ detail?: string }>;
      error?: { message?: string };
      message?: string;
    };
    return (
      parsed.errors?.[0]?.detail ||
      parsed.error?.message ||
      parsed.message ||
      fallback
    );
  } catch {
    return fallback;
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ payment_method_id: string }> }
) {
  try {
    void request;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const secret = process.env.PAYMONGO_SECRET_KEY;
    if (!secret?.startsWith("sk_")) {
      return NextResponse.json(
        { error: "Payment gateway not configured." },
        { status: 503 }
      );
    }

    const { payment_method_id } = await ctx.params;
    if (!payment_method_id) {
      return NextResponse.json({ error: "Missing payment method id" }, { status: 400 });
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

    const customerId = profile?.paymongo_customer_id as string | undefined;
    if (!customerId) {
      return NextResponse.json({ ok: true });
    }

    const res = await fetch(
      `https://api.paymongo.com/v1/customers/${customerId}/payment_methods/${payment_method_id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Basic ${Buffer.from(secret + ":").toString("base64")}`,
        },
      }
    );

    if (!res.ok) {
      const raw = await res.text();
      console.error("PayMongo delete saved card error", res.status, raw);
      const detail = parsePayMongoDetail(raw, "Could not remove card.");
      return NextResponse.json({ error: `PayMongo: ${detail}` }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Delete saved method error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

