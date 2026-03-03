"use client";

import { useState } from "react";
import { Send, Utensils } from "lucide-react";

export function NutritionCoach({ onLogAdded }: { onLogAdded?: () => void }) {
  const [meal, setMeal] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ calories: number; protein: number; carbs: number; fats: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meal.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/nutrition/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meal: meal.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ calories: data.calories, protein: data.protein, carbs: data.carbs, fats: data.fats });
        setMeal("");
        onLogAdded?.();
      } else {
        setError(data?.error || "Failed to parse meal");
      }
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-6 col-span-2 glow-lime transition-shadow duration-300 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Utensils className="w-5 h-5 text-accent-lime" />
        <h3 className="font-semibold text-sm uppercase tracking-wider text-accent-lime/90">
          AI Nutrition Coach
        </h3>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={meal}
          onChange={(e) => setMeal(e.target.value)}
          placeholder='e.g. "3 eggs and 1 longganisa"'
          className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm placeholder:text-white/30 focus:outline-none focus:border-accent-lime/50"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !meal.trim()}
          className="px-4 py-2.5 rounded-lg bg-accent-lime/20 text-accent-lime hover:bg-accent-lime/30 disabled:opacity-50 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
      {error && (
        <p className="mt-4 text-sm text-red-400">{error}</p>
      )}
      {result && (
        <div className="mt-4 flex gap-4 text-sm animate-fade-in">
          <span className="text-accent-lime">Cal: {result.calories}</span>
          <span className="text-accent-cyan">P: {result.protein}g</span>
          <span className="text-amber-400">C: {result.carbs}g</span>
          <span className="text-orange-400">F: {result.fats}g</span>
        </div>
      )}
    </div>
  );
}
