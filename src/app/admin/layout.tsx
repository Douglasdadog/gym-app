"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Dumbbell,
  LayoutDashboard,
  Users,
  Wallet,
  Settings,
  LogOut,
  UserPlus,
  Calendar,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

const ADMIN_NAV = [
  { href: "/admin", label: "Business Overview", icon: LayoutDashboard },
  { href: "/admin/schedule", label: "Schedule", icon: Calendar },
  { href: "/admin/members", label: "Member List", icon: Users },
  { href: "/admin/leads", label: "Leads", icon: UserPlus },
  { href: "/admin/trainers", label: "Trainer Payouts", icon: Wallet },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const check = async () => {
      try {
        const [userResult, res] = await Promise.all([
          supabase.auth.getUser(),
          fetchWithTimeout("/api/auth/role", { credentials: "include", timeoutMs: 10000 }),
        ]);
        const { data: { user } } = userResult;
        if (!user) {
          router.replace("/auth?redirect=/admin");
          return;
        }
        const data = await res.json();
        if (data.role !== "admin") {
          router.replace("/dashboard");
          return;
        }
      } catch {
        router.replace("/dashboard");
        return;
      }
      setLoading(false);
    };
    check();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex">
        <aside className="w-64 fixed left-0 top-0 h-screen glass border-r border-white/10 animate-pulse" />
        <main className="flex-1 ml-64 flex items-center justify-center">
          <div className="animate-pulse text-accent-lime">Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] flex">
      {/* Fixed Sidebar */}
      <aside className="w-64 fixed left-0 top-0 h-screen glass border-r border-white/10 flex flex-col z-40">
        <div className="p-6 border-b border-white/10">
          <Link href="/admin" className="flex items-center gap-2">
            <Dumbbell className="w-8 h-8 text-accent-lime" />
            <span className="font-bold text-xl tracking-tight text-accent-lime">
              CYBER-GYM
            </span>
          </Link>
          <p className="text-xs text-white/50 mt-1 uppercase tracking-wider">
            Admin Panel
          </p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {ADMIN_NAV.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-accent-lime/20 text-accent-lime border border-accent-lime/30"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5"
          >
            <LayoutDashboard className="w-5 h-5" />
            User Dashboard
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/");
              router.refresh();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 mt-1"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content - scrollable */}
      <main className="flex-1 ml-64 min-h-screen overflow-y-auto">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
