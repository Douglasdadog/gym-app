import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { ok: false, error: "Missing SUPABASE_URL or ANON_KEY in env" },
        { status: 500 }
      );
    }

    const supabase = createClient(url, key);
    const { data, error } = await supabase.from("gym_status").select("current_occupancy").limit(1).single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, hint: "Run the SQL setup script in Supabase if tables don't exist" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
