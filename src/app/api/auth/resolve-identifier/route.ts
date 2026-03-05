import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const rawIdentifier = body?.identifier as string | undefined;
    const identifier = rawIdentifier?.trim();

    if (!identifier) {
      return NextResponse.json({ error: "Identifier is required" }, { status: 400 });
    }

    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // If it's an email, normalise and verify it exists.
    if (identifier.includes("@")) {
      const normalized = identifier.toLowerCase();
      const { data } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("email", normalized)
        .maybeSingle();

      if (!data?.email) {
        return NextResponse.json({ error: "No account found with that email." }, { status: 404 });
      }

      return NextResponse.json({ email: data.email.toLowerCase() });
    }

    // Otherwise treat it as a username and resolve to email.
    const username = identifier.toLowerCase();

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("email, username")
      .or(`username.eq.${username},email.eq.${username}`)
      .maybeSingle();

    if (error) {
      console.error("resolve-identifier query error:", error);
      return NextResponse.json({ error: "Failed to look up account." }, { status: 500 });
    }

    if (!data?.email) {
      return NextResponse.json({ error: "No account found with that username." }, { status: 404 });
    }

    return NextResponse.json({ email: data.email.toLowerCase() });
  } catch (e) {
    console.error("resolve-identifier error:", e);
    return NextResponse.json({ error: "Failed to resolve identifier." }, { status: 500 });
  }
}

