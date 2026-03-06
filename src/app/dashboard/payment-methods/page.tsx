"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Dumbbell, CreditCard, LayoutDashboard, Calendar, Utensils, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { addDemoCardFromInput, loadDemoCards, removeDemoCard } from "@/lib/demoCards";

const PAYMONGO_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY ?? "";
const DEMO_PAYMENTS = process.env.NEXT_PUBLIC_DEMO_PAYMENTS === "1";

type SavedMethod = {
  id: string;
  type: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
  created_at?: number;
};

export default function PaymentMethodsPage() {
  const [loading, setLoading] = useState(true);
  const [hasCustomer, setHasCustomer] = useState(false);
  const [savedMethodsLoading, setSavedMethodsLoading] = useState(false);
  const [savedMethods, setSavedMethods] = useState<SavedMethod[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvc, setCvc] = useState("");
  const [billingName, setBillingName] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const loadSavedMethods = useCallback(async () => {
    setSavedMethodsLoading(true);
    try {
      if (DEMO_PAYMENTS) {
        const demo = loadDemoCards().map((c) => ({
          id: c.id,
          type: c.brand,
          last4: c.last4,
          exp_month: c.exp_month,
          exp_year: c.exp_year,
          created_at: c.created_at,
        })) satisfies SavedMethod[];
        setSavedMethods(demo);
        return;
      }
      const res = await fetchWithTimeout("/api/payment/saved-methods", {
        credentials: "include",
        timeoutMs: 12000,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Could not load saved cards.");
        setSavedMethods([]);
        return;
      }
      setSavedMethods((data as { methods?: SavedMethod[] }).methods ?? []);
    } finally {
      setSavedMethodsLoading(false);
    }
  }, []);

  useEffect(() => {
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace("/auth?redirect=/dashboard/payment-methods");
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("paymongo_customer_id, full_name, role")
          .eq("id", user.id)
          .single();
        setHasCustomer(!!profile?.paymongo_customer_id);
        setBillingName((profile?.full_name ?? "").trim() || "Cardholder");
        setIsAdmin(profile?.role === "admin");
        if (profile?.paymongo_customer_id) {
          await loadSavedMethods();
        } else {
          setSavedMethods([]);
        }
      } catch {
        router.replace("/auth?redirect=/dashboard/payment-methods");
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [supabase, router, loadSavedMethods]);

  useEffect(() => {
    if (searchParams.get("setup") === "success") {
      setSuccess(true);
      setHasCustomer(true);
      setShowForm(false);
      loadSavedMethods();
      window.history.replaceState({}, "", "/dashboard/payment-methods");
    }
  }, [searchParams, loadSavedMethods]);

  const ensureCustomer = async (): Promise<boolean> => {
    if (DEMO_PAYMENTS) {
      setHasCustomer(true);
      setError("");
      await loadSavedMethods();
      return true;
    }
    const res = await fetchWithTimeout("/api/payment/customer", {
      method: "POST",
      credentials: "include",
      timeoutMs: 10000,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Could not set up payment profile.");
      return false;
    }
    setHasCustomer(true);
    setError("");
    await loadSavedMethods();
    return true;
  };

  const removeSavedMethod = async (paymentMethodId: string) => {
    setRemoving(paymentMethodId);
    setError("");
    try {
      if (DEMO_PAYMENTS) {
        removeDemoCard(paymentMethodId);
        await loadSavedMethods();
        return;
      }
      const res = await fetchWithTimeout(`/api/payment/saved-methods/${paymentMethodId}`, {
        method: "DELETE",
        credentials: "include",
        timeoutMs: 12000,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Could not remove card.");
        return;
      }
      await loadSavedMethods();
    } finally {
      setRemoving(null);
    }
  };

  const createPaymentMethod = async (): Promise<string | null> => {
    if (!PAYMONGO_PUBLIC_KEY.startsWith("pk_")) {
      setError("Payment gateway is not configured for adding cards.");
      return null;
    }
    const res = await fetch("https://api.paymongo.com/v1/payment_methods", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(PAYMONGO_PUBLIC_KEY + ":")}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            type: "card",
            details: {
              card_number: cardNumber.replace(/\s/g, ""),
              exp_month: parseInt(expMonth, 10),
              exp_year: parseInt(expYear, 10),
              cvc: cvc.trim(),
            },
            billing: {
              name: billingName.trim() || "Cardholder",
            },
          },
        },
      }),
    });
    const data = (await res.json()) as { data?: { id?: string }; errors?: Array<{ detail?: string }> };
    if (!res.ok || !data.data?.id) {
      const msg = data.errors?.[0]?.detail ?? "Invalid card details.";
      setError(msg);
      return null;
    }
    setError("");
    return data.data.id;
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAdding(true);
    try {
      if (DEMO_PAYMENTS) {
        const r = addDemoCardFromInput({ cardNumber, expMonth, expYear });
        if (!r.ok) {
          setError(r.error);
          setAdding(false);
          return;
        }
        setSuccess(true);
        setHasCustomer(true);
        setShowForm(false);
        setCardNumber("");
        setExpMonth("");
        setExpYear("");
        setCvc("");
        await loadSavedMethods();
        return;
      }

      if (!hasCustomer && !(await ensureCustomer())) {
        setAdding(false);
        return;
      }
      const setupRes = await fetchWithTimeout("/api/payment/setup-card", {
        method: "POST",
        credentials: "include",
        timeoutMs: 10000,
      });
      if (!setupRes.ok) {
        const d = await setupRes.json().catch(() => ({}));
        const msg = (d as { error?: string }).error ?? "Could not start card setup.";
        if (msg.includes("On session payments are not yet supported")) {
          setError("Saved cards aren’t enabled for this PayMongo account yet. Turn on DEMO mode for presentation, or enable PayMongo Card Vaulting.");
        } else {
          setError(msg);
        }
        setAdding(false);
        return;
      }
      const { payment_intent_id, client_key } = (await setupRes.json()) as {
        payment_intent_id: string;
        client_key: string;
      };
      const paymentMethodId = await createPaymentMethod();
      if (!paymentMethodId) {
        setAdding(false);
        return;
      }
      const attachRes = await fetchWithTimeout("/api/payment/attach-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          payment_intent_id,
          payment_method_id: paymentMethodId,
          client_key,
          return_url: `${typeof window !== "undefined" ? window.location.origin : ""}/dashboard/payment-methods?setup=success`,
        }),
        timeoutMs: 15000,
      });
      const attachData = (await attachRes.json()) as {
        redirect_url?: string;
        status?: string;
        error?: string;
      };
      if (!attachRes.ok) {
        setError(attachData.error ?? "Could not save card.");
        setAdding(false);
        return;
      }
      if (attachData.redirect_url) {
        window.location.href = attachData.redirect_url;
        return;
      }
      setSuccess(true);
      setHasCustomer(true);
      setShowForm(false);
      setCardNumber("");
      setExpMonth("");
      setExpYear("");
      setCvc("");
      await loadSavedMethods();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000]">
        <header className="border-b border-white/10 sticky top-0 z-50 glass">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 opacity-80">
              <Dumbbell className="w-8 h-8 text-accent-lime" />
              <span className="font-bold text-xl tracking-tight">CYBER-GYM</span>
            </Link>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="h-9 w-48 bg-white/10 rounded animate-pulse" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000]">
      <header className="border-b border-white/10 sticky top-0 z-50 glass">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Dumbbell className="w-8 h-8 text-accent-lime" />
            <span className="font-bold text-xl tracking-tight">CYBER-GYM</span>
          </Link>
          <nav className="flex gap-4 text-sm items-center">
            <Link href="/dashboard" className="text-white/60 hover:text-white flex items-center gap-1">
              <LayoutDashboard className="w-4 h-4" /> My Fitness
            </Link>
            <Link href="/bookings" className="text-white/60 hover:text-white flex items-center gap-1">
              <Calendar className="w-4 h-4" /> Bookings
            </Link>
            <Link href="/meal-logs" className="text-white/60 hover:text-white flex items-center gap-1">
              <Utensils className="w-4 h-4" /> Meal Logs
            </Link>
            <Link href="/dashboard/payment-methods" className="text-accent-lime font-medium flex items-center gap-1">
              <CreditCard className="w-4 h-4" /> Payment
            </Link>
            {isAdmin && (
              <Link href="/admin" className="text-accent-cyan hover:text-accent-cyan/80 flex items-center gap-1">
                <Shield className="w-4 h-4" /> Admin
              </Link>
            )}
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/");
                router.refresh();
              }}
              className="text-white/60 hover:text-white"
            >
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Payment methods</h1>
        <p className="text-white/60 mb-8">
          Add a card to pay for memberships and trainer bookings quickly. Your card is stored securely and can be used for future payments.
        </p>
        {DEMO_PAYMENTS && (
          <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm">
            Demo mode is ON. Cards are saved locally for presentation (last4 + expiry only).
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-accent-lime/20 text-accent-lime border border-accent-lime/40">
            Card saved successfully. You can use it for future payments.
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40">
            {error}
          </div>
        )}

        {!showForm && (
          <div className="glass rounded-2xl p-6 max-w-md">
            <div className="flex items-center gap-3 text-white/80">
              <CreditCard className="w-8 h-8 text-accent-lime" />
              <div>
                <p className="font-medium">Saved payment methods</p>
                <p className="text-sm text-white/60">
                  {savedMethodsLoading
                    ? "Loading your saved cards…"
                    : savedMethods.length > 0
                      ? "These cards can be used for faster checkout."
                      : "No saved cards yet."}
                </p>
              </div>
            </div>

            {savedMethods.length > 0 && (
              <div className="mt-4 space-y-2">
                {savedMethods.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white/80 truncate">
                        {m.type === "card" ? "Card" : m.type} •••• {m.last4 ?? "----"}
                      </p>
                      <p className="text-xs text-white/50">
                        Exp {String(m.exp_month ?? "").padStart(2, "0")}/{m.exp_year ?? "----"}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={removing === m.id}
                      onClick={() => removeSavedMethod(m.id)}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 text-xs disabled:opacity-50"
                    >
                      {removing === m.id ? "Removing…" : "Remove"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
            >
              {savedMethods.length > 0 ? "Add another card" : "Add a card"}
            </button>
          </div>
        )}

        {showForm && (
          <div className="glass rounded-2xl p-6 max-w-md">
            <h2 className="text-lg font-semibold mb-4">Add card</h2>
            <p className="text-sm text-white/60 mb-4">
              A one-time ₱20 verification charge may be applied to save your card. Card details are sent directly to our payment provider and are not stored on our servers.
            </p>
            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">Name on card</label>
                <input
                  type="text"
                  value={billingName}
                  onChange={(e) => setBillingName(e.target.value)}
                  placeholder="Cardholder name"
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white placeholder-white/40"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-1">Card number</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 19))}
                  placeholder="4242 4242 4242 4242"
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white placeholder-white/40 font-mono"
                  maxLength={19}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Month</label>
                  <input
                    type="text"
                    value={expMonth}
                    onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    placeholder="12"
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white placeholder-white/40"
                    maxLength={2}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Year</label>
                  <input
                    type="text"
                    value={expYear}
                    onChange={(e) => setExpYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="2028"
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white placeholder-white/40"
                    maxLength={4}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">CVC</label>
                  <input
                    type="text"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="123"
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/20 text-white placeholder-white/40"
                    maxLength={4}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={adding}
                  className="px-4 py-2 rounded-lg bg-accent-lime text-black font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {adding ? "Saving…" : "Save card"}
                </button>
                {showForm && (
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        <p className="mt-8 text-sm text-white/50">
          For GCash, PayMaya, and other e-wallets, you can choose them at checkout when paying for a membership or booking. They are not saved for automatic charges.
        </p>
      </main>
    </div>
  );
}
