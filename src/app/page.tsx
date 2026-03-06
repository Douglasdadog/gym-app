"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Dumbbell,
  Users,
  Utensils,
  Calendar,
  Zap,
  Shield,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import { SupportChat } from "@/components/SupportChat";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const check = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        try {
          const res = await fetchWithTimeout("/api/auth/role", { credentials: "include", timeoutMs: 8000 });
          const data = await res.json();
          const dest = data.role === "admin" ? "/admin" : "/dashboard";
          router.replace(dest);
        } catch {
          router.replace("/dashboard");
        }
        return;
      }
      setLoading(false);
    };
    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, session: { user?: unknown } | null) => {
      if (session?.user) {
        try {
          const res = await fetchWithTimeout("/api/auth/role", { credentials: "include", timeoutMs: 8000 });
          const data = await res.json();
          const dest = data.role === "admin" ? "/admin" : "/dashboard";
          router.replace(dest);
        } catch {
          router.replace("/dashboard");
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="animate-pulse text-accent-cyan">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000]">
      {/* Header */}
      <header className="border-b border-white/10 sticky top-0 z-50 glass">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Dumbbell className="w-8 h-8 text-accent-lime" />
            <span className="font-bold text-xl tracking-tight">CYBER-GYM</span>
          </Link>
          <nav className="flex gap-4 text-sm items-center">
            <a href="#features" className="text-white/60 hover:text-white hidden sm:inline">
              Features
            </a>
            <a href="#membership" className="text-white/60 hover:text-white hidden sm:inline">
              Membership
            </a>
            <Link href="/auth?redirect=/bookings" className="text-white/60 hover:text-white hidden sm:inline">
              Book Trainer
            </Link>
            <Link
              href="/auth"
              className="px-4 py-2 rounded-lg bg-accent-lime text-black font-semibold hover:bg-accent-lime/90 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth?signup=1"
              className="px-4 py-2 rounded-lg glass text-accent-cyan hover:bg-white/5 transition-colors font-medium"
            >
              Create Account
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent-lime/5 via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-32 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <p className="text-accent-lime font-semibold text-sm uppercase tracking-wider mb-4">
              Premium Fitness Experience
            </p>
            <h1 className="text-4xl sm:text-6xl font-bold leading-tight mb-6">
              Train Smarter.
              <br />
              <span className="text-accent-lime">Live Stronger.</span>
            </h1>
            <p className="text-lg text-white/70 mb-10 max-w-xl">
              Join Cyber-Gym for AI-powered nutrition coaching, live gym occupancy tracking,
              and personal training at the gym or your home. Your fitness journey starts here.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/auth?signup=1"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-lime text-black font-semibold hover:bg-accent-lime/90 transition-colors"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass text-white hover:bg-white/5 transition-colors font-medium"
              >
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl font-bold mb-2"
          >
            Why Cyber-Gym?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-white/60 mb-12"
          >
            Everything you need to reach your goals
          </motion.p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Users,
                title: "Live Occupancy",
                desc: "See how busy the gym is in real-time. Check in and out to help others plan.",
                color: "text-accent-lime",
              },
              {
                icon: Utensils,
                title: "AI Nutrition Coach",
                desc: "Type your meals and get instant macro breakdowns powered by Grok AI.",
                color: "text-accent-cyan",
              },
              {
                icon: Calendar,
                title: "PT Booking",
                desc: "Book trainers at the gym or at home. Flexible scheduling for your life.",
                color: "text-accent-lime",
              },
              {
                icon: Zap,
                title: "Smart Dashboard",
                desc: "Track macros, next sessions, and membership—all in one place.",
                color: "text-accent-cyan",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-6 hover:border-accent-lime/30 transition-colors"
              >
                <item.icon className={`w-10 h-10 ${item.color} mb-4`} />
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-white/60">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Membership Tiers */}
      <section id="membership" className="py-20 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-3xl font-bold mb-2"
          >
            Membership Tiers
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-white/60 mb-12"
          >
            Choose the plan that fits your goals
          </motion.p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Basic",
                price: "Gym Access",
                perks: ["24/7 gym access", "Equipment use", "Locker rooms"],
                highlight: false,
              },
              {
                name: "Elite",
                price: "Gym + More",
                perks: ["Everything in Basic", "Sauna access", "Group classes", "Priority booking"],
                highlight: true,
              },
              {
                name: "VIP",
                price: "All-Access",
                perks: ["Everything in Elite", "Home PT priority", "Unlimited AI coaching", "Dedicated support"],
                highlight: false,
              },
            ].map((tier) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`glass rounded-2xl p-8 ${
                  tier.highlight ? "ring-2 ring-accent-lime" : ""
                }`}
              >
                <h3 className="text-xl font-bold mb-1">{tier.name}</h3>
                <p className="text-accent-lime font-semibold mb-6">{tier.price}</p>
                <ul className="space-y-3 text-sm text-white/70">
                  {tier.perks.map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-accent-cyan shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth?signup=1"
                  className={`mt-8 block text-center py-3 rounded-xl font-semibold transition-colors ${
                    tier.highlight
                      ? "bg-accent-lime text-black hover:bg-accent-lime/90"
                      : "glass hover:bg-white/5"
                  }`}
                >
                  Get Started
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass rounded-3xl p-12 sm:p-16 text-center"
          >
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              Ready to transform your fitness?
            </h2>
            <p className="text-white/50 mb-8 max-w-xl mx-auto">
              Create an account to book trainers, track your nutrition, and access your personal dashboard.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/auth?signup=1"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-accent-lime text-black font-semibold hover:bg-accent-lime/90 transition-colors"
              >
                Create Account <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/auth"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/30 transition-colors font-medium"
              >
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-accent-lime" />
            <span className="font-bold tracking-tight">CYBER-GYM</span>
          </div>
          <div className="flex gap-6 text-sm text-white/50">
            <Link href="/auth" className="hover:text-white">
              Sign In
            </Link>
            <Link href="/auth?signup=1" className="hover:text-white">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>

      <SupportChat />
    </div>
  );
}
