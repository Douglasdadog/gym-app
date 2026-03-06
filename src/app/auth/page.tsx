"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthPage() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const signup = searchParams.get("signup");
    if (signup === "1") setIsSignUp(true);
  }, [searchParams]);

  useEffect(() => {
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          let role = "user";
          try {
            const res = await fetchWithTimeout("/api/auth/role", { credentials: "include", timeoutMs: 8000 });
            const data = await res.json();
            role = data.role ?? "user";
          } catch {
            role = "user";
          }
          if (role === "admin") {
            router.replace("/admin");
          } else {
            router.replace(searchParams.get("redirect") || "/dashboard");
          }
          return;
        }
      } finally {
        setAuthChecking(false);
      }
    };
    check();
  }, [supabase, router, searchParams]);

  const resolveIdentifierToEmail = async () => {
    const raw = username.trim();
    if (!raw) throw new Error("Enter your username or email.");

    const value = raw.toLowerCase();

    // Demo shortcuts
    if (value === "user") return "user@cybergym.demo";
    if (value === "admin") return "admin@cybergym.demo";
    if (value.includes("@")) return value;

    const res = await fetchWithTimeout("/api/auth/resolve-identifier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: value }),
    });
    const data = await res.json();
    if (!res.ok || !data?.email) {
      throw new Error(data?.error || "No account found with that username.");
    }
    return String(data.email).toLowerCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const redirectTo = searchParams.get("redirect") || "/dashboard";
    try {
      if (isSignUp) {
        const authEmail = email.trim().toLowerCase();
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim() || undefined,
              username: username.trim() || undefined,
              phone_number: phoneNumber.trim() || undefined,
            },
          },
        });
        if (error) throw error;
        if (data.session) {
          let role = "user";
          try {
            const res = await fetchWithTimeout("/api/auth/role", { credentials: "include", timeoutMs: 8000 });
            const data2 = await res.json();
            role = data2.role ?? "user";
          } catch {
            role = "user";
          }
          if (role === "admin") {
            router.push("/admin");
          } else {
            router.push(redirectTo);
          }
          router.refresh();
        } else {
          setMessage("Sign up complete! Please sign in with your email or username.");
        }
      } else {
        const authEmail = await resolveIdentifierToEmail();
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
        if (error) throw error;
        let role = "user";
        try {
          const res = await fetchWithTimeout("/api/auth/role", { credentials: "include", timeoutMs: 8000 });
          const data = await res.json();
          role = data.role ?? "user";
        } catch {
          role = "user";
        }
        if (role === "admin") {
          router.push("/admin");
        } else {
          router.push(redirectTo);
        }
        router.refresh();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="animate-pulse text-accent-cyan">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
      <Link href="/" className="absolute top-4 left-4 text-white/60 hover:text-white text-sm">
        ← Back to Home
      </Link>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8 w-full max-w-md"
      >
        <div className="flex items-center gap-2 justify-center mb-8">
          <Dumbbell className="w-10 h-10 text-accent-lime" />
          <span className="font-bold text-2xl tracking-tight">CYBER-GYM</span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                required
                autoComplete="name"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-accent-lime/50"
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                required
                autoComplete="username"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-accent-lime/50"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-accent-lime/50"
              />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Phone number"
                autoComplete="tel"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-accent-lime/50"
              />
            </>
          )}
          {!isSignUp && (
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username or email"
              required
              autoComplete="username"
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-accent-lime/50"
            />
          )}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-accent-lime/50"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-accent-lime text-black font-semibold hover:bg-accent-lime/90 disabled:opacity-50"
          >
            {loading ? "..." : isSignUp ? "Sign Up" : "Sign In"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="mt-4 w-full text-sm text-accent-cyan hover:underline"
        >
          {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
        </button>
        {message && <p className="mt-4 text-sm text-white/70">{message}</p>}
        <p className="mt-6 text-center text-xs text-white/40">
          You need an account to book trainers and access your dashboard.
        </p>
        <p className="mt-3 text-center text-xs text-accent-cyan/70">
          Demo: user / user123 &nbsp;|&nbsp; admin / admin123
        </p>
      </motion.div>
    </div>
  );
}
