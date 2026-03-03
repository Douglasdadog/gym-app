"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";

interface Member {
  id: string;
  full_name: string;
  membership_tier?: string;
}

export function MemberList() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch("/api/members/list", { credentials: "include" });
        const data = await res.json();
        setMembers(data.members ?? []);
      } catch {
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass rounded-2xl p-6 col-span-2 md:col-span-1 min-h-[180px] flex items-center justify-center"
      >
        <div className="animate-pulse text-accent-cyan/60">Loading...</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass rounded-2xl p-6 col-span-2 md:col-span-1 glow-cyan"
    >
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-accent-cyan" />
        <h3 className="font-semibold text-sm uppercase tracking-wider text-accent-cyan/90">
          Member List
        </h3>
      </div>
      <div className="max-h-[200px] overflow-y-auto space-y-2">
        {members.length === 0 ? (
          <p className="text-sm text-white/50">No members yet.</p>
        ) : (
          members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg bg-white/5 text-sm text-white/80"
            >
              <span>{m.full_name}</span>
              {m.membership_tier && m.membership_tier !== "None" && (
                <span className="text-xs text-accent-cyan/70">{m.membership_tier}</span>
              )}
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
