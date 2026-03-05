import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createServiceClient(supabaseUrl, serviceKey);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("leads")
      .select("id, created_at, name, email, phone, interest, source")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch leads error:", error);
      return NextResponse.json(
        { error: "Failed to fetch leads" },
        { status: 500 },
      );
    }

    return NextResponse.json({ leads: data ?? [] });
  } catch (err) {
    console.error("Admin leads GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 },
    );
  }
}

