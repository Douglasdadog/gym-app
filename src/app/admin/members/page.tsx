"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, XCircle, Loader2, Snowflake, Sun, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
interface MemberRow {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  tier: string;
  status: string;
  join_date: string;
  membership_id: string;
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showCancelModal, setShowCancelModal] = useState<MemberRow | null>(null);
  const [showFreezeModal, setShowFreezeModal] = useState<MemberRow | null>(null);
  const [showUnfreezeModal, setShowUnfreezeModal] = useState<MemberRow | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState<MemberRow | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [freezing, setFreezing] = useState(false);
  const [unfreezing, setUnfreezing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const res = await fetchWithTimeout("/api/admin/members", { credentials: "include" });
        const data = await res.json();
        if (!res.ok) {
          setMembers([]);
          return;
        }
        setMembers(data.members ?? []);
      } catch (e) {
        console.error(e);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };
    loadMembers();
  }, []);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        search === "" ||
        m.email.toLowerCase().includes(search.toLowerCase()) ||
        (m.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (m.username ?? "").toLowerCase().includes(search.toLowerCase());
      const matchTier = filterTier === "all" || m.tier === filterTier;
      const matchStatus = filterStatus === "all" || m.status === filterStatus;
      return matchSearch && matchTier && matchStatus;
    });
  }, [members, search, filterTier, filterStatus]);

  const handleFreeze = async (row: MemberRow) => {
    if (!row) return;
    setFreezing(true);
    try {
      const res = await fetchWithTimeout(`/api/admin/members/${row.user_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "freeze" }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to freeze");
      setMembers((prev) =>
        prev.map((m) => (m.id === row.id ? { ...m, status: "frozen", tier: "None" } : m))
      );
      setShowFreezeModal(null);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to freeze membership");
    } finally {
      setFreezing(false);
    }
  };

  const handleUnfreeze = async (row: MemberRow) => {
    if (!row) return;
    setUnfreezing(true);
    try {
      const res = await fetchWithTimeout(`/api/admin/members/${row.user_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unfreeze" }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to unfreeze");
      setMembers((prev) =>
        prev.map((m) => (m.id === row.id ? { ...m, status: "active", tier: "Basic" } : m))
      );
      setShowUnfreezeModal(null);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to unfreeze membership");
    } finally {
      setUnfreezing(false);
    }
  };

  const handleRemove = async (row: MemberRow) => {
    if (!row) return;
    setRemoving(true);
    try {
      const res = await fetchWithTimeout(`/api/admin/members/${row.user_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove" }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove");
      setMembers((prev) => prev.filter((m) => m.id !== row.id));
      setShowRemoveModal(null);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to remove account");
    } finally {
      setRemoving(false);
    }
  };

  const handleCancelMembership = async (row: MemberRow) => {
    if (!row) return;
    setCancelling(true);
    try {
      const hasMembership = row.membership_id !== row.user_id;
      if (hasMembership) {
        const { error: memError } = await supabase
          .from("memberships")
          .update({ status: "cancelled", type: "None" })
          .eq("id", row.membership_id);

        if (memError) throw memError;
      }

      await supabase
        .from("profiles")
        .update({ membership_tier: "None" })
        .eq("id", row.user_id);

      setMembers((prev) =>
        prev.map((m) =>
          m.id === row.id ? { ...m, status: "cancelled", tier: "None" } : m
        )
      );
      setShowCancelModal(null);
    } catch (err) {
      console.error(err);
      alert("Failed to cancel membership");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl sm:text-3xl font-bold"
      >
        Member List
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/10"
      >
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder="Search by name, email or username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm placeholder:text-white/30 focus:outline-none focus:border-accent-lime/50"
            />
          </div>
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-accent-lime/50"
          >
            <option value="all">All Tiers</option>
            <option value="None">None</option>
            <option value="Basic">Basic</option>
            <option value="Elite">Elite</option>
            <option value="VIP">VIP</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-accent-lime/50"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="frozen">Frozen</option>
            <option value="cancelled">Cancelled</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-accent-lime" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Member</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Username</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Tier</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Join Date</th>
                  <th className="text-right py-3 px-4 text-white/60 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium">{row.full_name || "—"}</p>
                        <p className="text-xs text-white/50">{row.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white/80">
                        {row.username && row.username !== "—" ? `@${row.username}` : "—"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${
                          row.tier === "VIP"
                            ? "bg-amber-500/20 text-amber-400"
                            : row.tier === "Elite"
                            ? "bg-accent-lime/20 text-accent-lime"
                            : row.tier === "Basic"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-white/10 text-white/70"
                        }`}
                      >
                        {row.tier}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded-lg text-xs font-medium ${
                          row.status === "active"
                            ? "bg-green-500/20 text-green-400"
                            : row.status === "cancelled"
                            ? "bg-red-500/20 text-red-400"
                            : row.status === "frozen"
                            ? "bg-cyan-500/20 text-cyan-400"
                            : row.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-white/10 text-white/70"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-white/70">{row.join_date}</td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {row.status === "active" && (
                          <button
                            onClick={() => setShowCancelModal(row)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-500/20 text-sm font-medium"
                          >
                            <XCircle className="w-4 h-4" />
                            Cancel
                          </button>
                        )}
                        {(row.status === "active" || row.status === "pending") && (
                          <button
                            onClick={() => setShowFreezeModal(row)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-cyan-400 hover:bg-cyan-500/20 text-sm font-medium"
                          >
                            <Snowflake className="w-4 h-4" />
                            Freeze
                          </button>
                        )}
                        {(row.status === "frozen" || row.status === "cancelled") && (
                          <button
                            onClick={() => setShowUnfreezeModal(row)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-amber-400 hover:bg-amber-500/20 text-sm font-medium"
                          >
                            <Sun className="w-4 h-4" />
                            Unfreeze
                          </button>
                        )}
                        <button
                          onClick={() => setShowRemoveModal(row)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-500/20 text-sm font-medium border border-red-500/30"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="py-12 text-center text-white/50">No members found.</p>
        )}
      </motion.div>

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => !cancelling && setShowCancelModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl p-6 max-w-md w-full border-2 border-red-500/50 bg-red-950/30"
            >
              <h3 className="text-xl font-bold text-red-400 mb-2">Cancel Membership</h3>
              <p className="text-white/80 mb-4">
                Are you sure you want to cancel the membership for{" "}
                <strong className="text-white">{showCancelModal.full_name || showCancelModal.email}</strong>?
                This will set their status to cancelled and tier to None.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCancelModal(null)}
                  disabled={cancelling}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCancelMembership(showCancelModal)}
                  disabled={cancelling}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium flex items-center gap-2"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    "Yes, Cancel Membership"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Freeze Confirmation Modal */}
      <AnimatePresence>
        {showFreezeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => !freezing && setShowFreezeModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl p-6 max-w-md w-full border-2 border-cyan-500/50 bg-cyan-950/30"
            >
              <h3 className="text-xl font-bold text-cyan-400 mb-2">Freeze Membership</h3>
              <p className="text-white/80 mb-4">
                Freeze the membership for{" "}
                <strong className="text-white">{showFreezeModal.full_name || showFreezeModal.email}</strong>?
                They will be checked out if currently in the gym. Their membership will be paused until you unfreeze.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowFreezeModal(null)}
                  disabled={freezing}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleFreeze(showFreezeModal)}
                  disabled={freezing}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium flex items-center gap-2"
                >
                  {freezing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Freezing...
                    </>
                  ) : (
                    "Yes, Freeze"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unfreeze Confirmation Modal */}
      <AnimatePresence>
        {showUnfreezeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => !unfreezing && setShowUnfreezeModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl p-6 max-w-md w-full border-2 border-amber-500/50 bg-amber-950/30"
            >
              <h3 className="text-xl font-bold text-amber-400 mb-2">Unfreeze Membership</h3>
              <p className="text-white/80 mb-4">
                Unfreeze the membership for{" "}
                <strong className="text-white">{showUnfreezeModal.full_name || showUnfreezeModal.email}</strong>?
                They will be restored to <strong className="text-amber-300">Basic</strong> tier and active status.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowUnfreezeModal(null)}
                  disabled={unfreezing}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUnfreeze(showUnfreezeModal)}
                  disabled={unfreezing}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium flex items-center gap-2"
                >
                  {unfreezing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Unfreezing...
                    </>
                  ) : (
                    <>
                      <Sun className="w-4 h-4" />
                      Yes, Unfreeze
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Remove Account Confirmation Modal */}
      <AnimatePresence>
        {showRemoveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => !removing && setShowRemoveModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl p-6 max-w-md w-full border-2 border-red-500/50 bg-red-950/30"
            >
              <h3 className="text-xl font-bold text-red-400 mb-2">Remove Account</h3>
              <p className="text-white/80 mb-4">
                Permanently remove{" "}
                <strong className="text-white">{showRemoveModal.full_name || showRemoveModal.email}</strong>?
                They will be checked out first. This cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowRemoveModal(null)}
                  disabled={removing}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemove(showRemoveModal)}
                  disabled={removing}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium flex items-center gap-2"
                >
                  {removing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    "Yes, Remove Account"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
