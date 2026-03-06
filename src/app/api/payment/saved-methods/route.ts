import { NextResponse } from "next/server";
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

type CustomerPaymentMethod = {
  id: string;
  payment_method_id: string;
  payment_method_type: string;
  created_at?: number;
};

type SavedMethod = {
  id: string; // payment_method_id
  type: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
  created_at?: number;
};

export async function GET() {
  try {
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
      return NextResponse.json({ methods: [] satisfies SavedMethod[] });
    }

    const listRes = await fetch(
      `https://api.paymongo.com/v1/customers/${customerId}/payment_methods`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(secret + ":").toString("base64")}`,
        },
      }
    );
    if (!listRes.ok) {
      const raw = await listRes.text();
      console.error("PayMongo list customer payment methods error", listRes.status, raw);
      const detail = parsePayMongoDetail(raw, "Could not load saved cards.");
      return NextResponse.json({ error: `PayMongo: ${detail}` }, { status: 502 });
    }

    const listJson = (await listRes.json()) as {
      data?: Array<{
        id?: string;
        attributes?: {
          payment_method_id?: string;
          payment_method_type?: string;
          created_at?: number;
        };
      }>;
    };

    const customerPaymentMethods: CustomerPaymentMethod[] = (listJson.data ?? [])
      .map((row) => ({
        id: String(row.id ?? ""),
        payment_method_id: String(row.attributes?.payment_method_id ?? ""),
        payment_method_type: String(row.attributes?.payment_method_type ?? ""),
        created_at: row.attributes?.created_at,
      }))
      .filter((m) => m.payment_method_id);

    const pmIds = Array.from(
      new Set(
        customerPaymentMethods
          .filter((m) => m.payment_method_type === "card")
          .map((m) => m.payment_method_id)
      )
    );

    const pmDetails = await Promise.all(
      pmIds.map(async (pmId) => {
        const res = await fetch(`https://api.paymongo.com/v1/payment_methods/${pmId}`, {
          headers: {
            Authorization: `Basic ${Buffer.from(secret + ":").toString("base64")}`,
          },
        });
        if (!res.ok) {
          const raw = await res.text();
          console.warn("PayMongo retrieve payment method failed", pmId, res.status, raw);
          return null;
        }
        const json = (await res.json()) as {
          data?: {
            id?: string;
            attributes?: {
              type?: string;
              details?: { last4?: string; exp_month?: number; exp_year?: number };
            };
          };
        };
        const attrs = json.data?.attributes;
        return {
          id: pmId,
          type: attrs?.type ?? "card",
          last4: attrs?.details?.last4,
          exp_month: attrs?.details?.exp_month,
          exp_year: attrs?.details?.exp_year,
        } satisfies Omit<SavedMethod, "created_at">;
      })
    );

    const createdAtByPmId = new Map<string, number | undefined>();
    for (const row of customerPaymentMethods) {
      if (!createdAtByPmId.has(row.payment_method_id)) {
        createdAtByPmId.set(row.payment_method_id, row.created_at);
      }
    }

    const methods: SavedMethod[] = pmDetails
      .filter((x): x is NonNullable<typeof x> => !!x)
      .map((pm) => ({ ...pm, created_at: createdAtByPmId.get(pm.id) }))
      .sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));

    return NextResponse.json({ methods });
  } catch (e) {
    console.error("Saved methods error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

