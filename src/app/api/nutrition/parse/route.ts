import { NextRequest, NextResponse } from "next/server";
import { parseMealToMacros } from "@/lib/grok/rotator";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { meal } = (await request.json()) as { meal: string };
    if (!meal?.trim()) {
      return NextResponse.json({ error: "Meal description required" }, { status: 400 });
    }

    const macros = await parseMealToMacros(meal.trim());

    const { data, error } = await supabase.from("nutrition_logs").insert({
      user_id: user.id,
      meal_description: macros.meal_description,
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fats: macros.fats,
    }).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Nutrition parse error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to parse meal" },
      { status: 500 }
    );
  }
}
