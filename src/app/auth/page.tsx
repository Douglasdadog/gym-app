"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        let role = "user";
        try {
          const res = await fetch("/api/auth/role", { credentials: "include" });
          const data = await res.json();
          role = data.role ?? "user";
        } catch {
          role = "user";
        }
        const redirectTo = searchParams.get("redirect");
        if (role === "admin") {
          router.replace("/admin");
        } else {
          router.replace(redirectTo || "/dashboard");
        }
        return;
      }
      setAuthChecking(false);
    };
    check();
  }, [supabase, router, searchParams]);

  const getEmail = () => {
    const v = usernameOrEmail.trim().toLowerCase();
    if (!isSignUp && v === "user") return "user@cybergym.demo";
    if (!isSignUp && v === "admin") return "admin@cybergym.demo";
    if (isSignUp && !v.includes("@")) return `${v}@cybergym.local`;
    return v;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const email = getEmail();
    const redirectTo = searchParams.get("redirect") || "/dashboard";
    try {
      if (isSignUp) {
        const displayName = usernameOrEmail.trim().includes("@")
          ? usernameOrEmail.trim().split("@")[0]
          : usernameOrEmail.trim();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: displayName || email } },
        });
        if (error) throw error;
        if (data.session) {
          let role = "user";
          try {
            const res = await fetch("/api/auth/role", { credentials: "include" });
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
          setMessage("Check your email to confirm sign up.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        let role = "user";
        try {
          const res = await fetch("/api/auth/role", { credentials: "include" });
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
          <input
            type="text"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
            placeholder={isSignUp ? "Username or email" : "Username or Email"}
            required
            autoComplete={isSignUp ? "email" : "username"}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-accent-lime/50"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
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
          Demo only: user / user123 &nbsp;|&nbsp; admin / admin123
        </p>
        <p className="mt-1 text-center text-xs text-white/30">
          New users: sign up with a username or email (no verification required).
        </p>
      </motion.div>
    </div>
  );
}
