import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, interest, source, transcript } = body as {
      name?: string;
      email?: string;
      phone?: string;
      interest?: string;
      source?: string;
      transcript?: string;
    };

    if (!name || !email || !phone || !interest) {
      return NextResponse.json(
        { error: "Missing required lead fields" },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Supabase server is not configured" },
        { status: 500 },
      );
    }

    const supabaseAdmin = createServiceClient(supabaseUrl, serviceKey);

    const { error } = await supabaseAdmin.from("leads").insert({
      name,
      email,
      phone,
      interest,
      source: source ?? "chatbot",
      notes: transcript ?? null,
    });

    if (error) {
      console.error("Insert lead error:", error);
      return NextResponse.json(
        { error: "Failed to save lead" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Leads POST error:", err);
    return NextResponse.json(
      { error: "Failed to save lead" },
      { status: 500 },
    );
  }
}

