"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Loader2, Mail, Phone, Filter } from "lucide-react";

type LeadRow = {
  id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  interest: string | null;
  source: string | null;
};

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSource, setFilterSource] = useState<string>("all");

  useEffect(() => {
    const loadLeads = async () => {
      try {
        const res = await fetch("/api/admin/leads", { credentials: "include" });
        const data = await res.json();
        if (!res.ok) {
          setLeads([]);
          setLoading(false);
          return;
        }
        setLeads(data.leads ?? []);
      } catch {
        setLeads([]);
      } finally {
        setLoading(false);
      }
    };
    loadLeads();
  }, []);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filterSource === "all") return true;
      return (l.source ?? "chatbot") === filterSource;
    });
  }, [leads, filterSource]);

  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl sm:text-3xl font-bold"
      >
        Leads
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/10"
      >
        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center justify-between">
          <p className="text-sm text-white/60 max-w-xl">
            Leads captured from the website chatbot and other entry points. Reach out to
            convert them into active members or PT clients.
          </p>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-white/40" />
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-accent-lime/50"
            >
              <option value="all">All Sources</option>
              <option value="chatbot">Chatbot</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-accent-lime" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-white/50">
            No leads captured yet. When visitors share their details in the chat, they will
            appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Name</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Contact</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">
                    Interest
                  </th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Source</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium text-white/90">
                        {lead.name || "Unknown"}
                      </p>
                      <p className="text-xs text-white/50">
                        {(lead.interest ?? "").toLowerCase().includes("vip")
                          ? "High intent"
                          : "New lead"}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 text-xs text-white/80">
                        {lead.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-accent-lime" />
                            {lead.email}
                          </span>
                        )}
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-accent-cyan" />
                            {lead.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-white/80">
                      {lead.interest || "—"}
                    </td>
                    <td className="py-3 px-4 text-white/70">
                      {(lead.source ?? "chatbot").toUpperCase()}
                    </td>
                    <td className="py-3 px-4 text-white/70">
                      {lead.created_at
                        ? new Date(lead.created_at).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}

