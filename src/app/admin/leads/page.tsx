"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Loader2,
  Mail,
  Phone,
  Filter,
  StickyNote,
  ListTodo,
  Calendar,
  X,
  Check,
  Plus,
  Trash2,
} from "lucide-react";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

type Staff = { id: string; full_name: string | null; email: string | null };
type LeadRow = {
  id: string;
  created_at: string;
  updated_at?: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  interest: string | null;
  source: string | null;
  notes: string | null;
  status: string | null;
  assigned_to_id: string | null;
};
type LeadTask = {
  id: string;
  lead_id: string;
  assigned_to_id: string | null;
  title: string;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
};
type MetaConversation = {
  sender_id: string;
  channel: "messenger" | "instagram";
  last_message: string;
  last_role: "user" | "assistant";
  last_at: string;
  message_count: number;
};

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<MetaConversation[]>([]);
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notesEditId, setNotesEditId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [tasksLeadId, setTasksLeadId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");

  const loadLeads = async () => {
    try {
      const res = await fetchWithTimeout("/api/admin/leads", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) {
        setLeads([]);
        setStaff([]);
        setConversations([]);
        setLoading(false);
        return;
      }
      setLeads(data.leads ?? []);
      setStaff(data.staff ?? []);
      setConversations(data.conversations ?? []);
    } catch {
      setLeads([]);
      setStaff([]);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    if (!tasksLeadId) return;
    setTasksLoading(true);
    fetchWithTimeout(`/api/admin/leads/${tasksLeadId}/tasks`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setTasks(d.tasks ?? []);
      })
      .catch(() => setTasks([]))
      .finally(() => setTasksLoading(false));
  }, [tasksLeadId]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filterSource !== "all") {
        const source = (l.source ?? "chatbot").toLowerCase();
        if (filterSource === "chatbot" && source !== "chatbot" && source !== "web-chat") return false;
        if (filterSource === "messenger" && source !== "meta-messenger") return false;
        if (filterSource === "instagram" && source !== "meta-instagram") return false;
      }
      if (filterStatus !== "all") {
        const status = (l.status ?? "new").toLowerCase();
        if (status !== filterStatus) return false;
      }
      return true;
    });
  }, [leads, filterSource, filterStatus]);

  const updateLead = async (id: string, patch: { status?: string; notes?: string | null; assigned_to_id?: string | null }) => {
    setUpdatingId(id);
    try {
      const res = await fetchWithTimeout(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Update failed");
      const leadData = (data as { lead?: LeadRow }).lead;
      if (leadData) {
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...leadData } : l)));
      }
      if (patch.notes !== undefined) {
        setNotesEditId(null);
        setNotesValue("");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update lead");
    } finally {
      setUpdatingId(null);
    }
  };

  const addTask = async () => {
    if (!tasksLeadId || !newTaskTitle.trim()) return;
    try {
      const res = await fetchWithTimeout(`/api/admin/leads/${tasksLeadId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: newTaskTitle.trim(), due_at: newTaskDue || null }),
      });
      if (!res.ok) throw new Error("Failed to add task");
      const data = await res.json();
      setTasks((prev) => [...prev, data.task]);
      setNewTaskTitle("");
      setNewTaskDue("");
    } catch {
      alert("Failed to add task");
    }
  };

  const toggleTaskComplete = async (taskId: string, completed: boolean) => {
    try {
      const res = await fetchWithTimeout(`/api/admin/leads/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error("Failed to update task");
      const data = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
    } catch {
      alert("Failed to update task");
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const res = await fetchWithTimeout(`/api/admin/leads/tasks/${taskId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete task");
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch {
      alert("Failed to delete task");
    }
  };

  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl sm:text-3xl font-bold"
      >
        Leads (CRM)
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/10"
      >
        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
          <p className="text-sm text-white/60 max-w-xl">
            Manage leads from chatbot and Messenger. Update status, add notes, assign to staff, and create tasks or reminders.
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="w-4 h-4 text-white/40" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-accent-lime/50"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-accent-lime/50"
            >
              <option value="all">All sources</option>
              <option value="chatbot">Chatbot (Web)</option>
              <option value="messenger">Messenger</option>
              <option value="instagram">Instagram</option>
            </select>
          </div>
        </div>

        {conversations.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white/80 mb-2">
              Meta Conversations (Messenger + Instagram)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {conversations.slice(0, 8).map((c) => (
                <div
                  key={`${c.channel}-${c.sender_id}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2 text-xs mb-1">
                    <span
                      className={`px-2 py-0.5 rounded-full ${
                        c.channel === "instagram"
                          ? "bg-pink-500/20 text-pink-300"
                          : "bg-blue-500/20 text-blue-300"
                      }`}
                    >
                      {c.channel === "instagram" ? "Instagram" : "Messenger"}
                    </span>
                    <span className="text-white/50">
                      {new Date(c.last_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 truncate">
                    {c.last_role === "assistant" ? "Bot:" : "User:"} {c.last_message}
                  </p>
                  <p className="text-[11px] text-white/50 mt-1">
                    Sender: {c.sender_id.slice(0, 8)}... • {c.message_count} msgs
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-accent-lime" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-white/50">
            No leads match the filters. Try &quot;All statuses&quot; and &quot;All sources&quot;.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Name</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Contact</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Interest</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Source</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Assigned to</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Notes</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Created</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <p className="font-medium text-white/90">{lead.name || "Unknown"}</p>
                      <p className="text-xs text-white/50">
                        {(lead.interest ?? "").toLowerCase().includes("vip") ? "High intent" : "Lead"}
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
                        {!lead.email && !lead.phone && "—"}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-white/80">{lead.interest || "—"}</td>
                    <td className="py-3 px-4 text-white/70">
                      {(() => {
                        const src = (lead.source ?? "chatbot").toLowerCase();
                        if (src === "meta-messenger") return "MESSENGER";
                        if (src === "meta-instagram") return "INSTAGRAM";
                        if (src === "web-chat") return "WEB CHAT";
                        return "CHATBOT";
                      })()}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={(lead.status ?? "new").toLowerCase()}
                        onChange={(e) => updateLead(lead.id, { status: e.target.value })}
                        disabled={updatingId === lead.id}
                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-accent-lime/50 disabled:opacity-50"
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={lead.assigned_to_id ?? ""}
                        onChange={(e) =>
                          updateLead(lead.id, {
                            assigned_to_id: e.target.value || null,
                          })
                        }
                        disabled={updatingId === lead.id}
                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-accent-lime/50 disabled:opacity-50 max-w-[120px]"
                      >
                        <option value="">Unassigned</option>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.full_name || s.email || s.id.slice(0, 8)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 max-w-[180px]">
                      <button
                        type="button"
                        onClick={() => {
                          setNotesEditId(lead.id);
                          setNotesValue(lead.notes ?? "");
                        }}
                        className="text-left text-xs text-white/70 hover:text-white/90 flex items-center gap-1 w-full min-h-[2rem]"
                      >
                        <StickyNote className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {lead.notes ? (lead.notes.length > 50 ? `${lead.notes.slice(0, 50)}…` : lead.notes) : "Add note"}
                        </span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-white/70">
                      {lead.created_at ? new Date(lead.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => setTasksLeadId(lead.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs"
                      >
                        <ListTodo className="w-3 h-3" />
                        Tasks
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Tasks modal */}
      {tasksLeadId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setTasksLeadId(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="glass rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-accent-lime" />
                Tasks &amp; reminders
              </h2>
              <button
                type="button"
                onClick={() => setTasksLeadId(null)}
                className="p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-white/50 mb-4">
              Lead: {leads.find((l) => l.id === tasksLeadId)?.name || "Unknown"}
            </p>

            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {tasksLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-accent-lime" />
                </div>
              ) : tasks.length === 0 ? (
                <p className="text-sm text-white/50 py-2">No tasks yet.</p>
              ) : (
                tasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 py-2 px-3 rounded-lg bg-white/5 border border-white/10"
                  >
                    <button
                      type="button"
                      onClick={() => toggleTaskComplete(t.id, !t.completed_at)}
                      className="shrink-0 w-5 h-5 rounded border border-white/30 flex items-center justify-center hover:bg-white/10"
                    >
                      {t.completed_at ? <Check className="w-3 h-3 text-accent-lime" /> : null}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm truncate ${t.completed_at ? "line-through text-white/50" : "text-white/90"}`}
                      >
                        {t.title}
                      </p>
                      {t.due_at && (
                        <p className="text-xs text-white/50 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(t.due_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteTask(t.id)}
                      className="shrink-0 p-1 rounded hover:bg-red-500/20 text-white/50 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task or reminder..."
                className="flex-1 min-w-[140px] h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-sm placeholder-white/40 focus:outline-none focus:border-accent-lime/50"
              />
              <input
                type="datetime-local"
                value={newTaskDue}
                onChange={(e) => setNewTaskDue(e.target.value)}
                className="h-10 px-3 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-accent-lime/50"
              />
              <button
                type="button"
                onClick={addTask}
                disabled={!newTaskTitle.trim()}
                className="h-10 px-4 rounded-lg bg-accent-lime text-black font-medium text-sm hover:bg-accent-lime/90 disabled:opacity-50 flex items-center justify-center gap-1 shrink-0"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Notes modal — spacious dropdown for editing notes */}
      {notesEditId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setNotesEditId(null);
            setNotesValue("");
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="glass rounded-2xl p-6 w-full max-w-lg border border-white/10 shadow-xl"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-accent-lime" />
                Notes
              </h2>
              <button
                type="button"
                onClick={() => {
                  setNotesEditId(null);
                  setNotesValue("");
                }}
                className="p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-white/50 mb-4">
              Lead: {leads.find((l) => l.id === notesEditId)?.name || "Unknown"}
            </p>
            <textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              rows={8}
              className="w-full min-h-[200px] px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/40 focus:outline-none focus:border-accent-lime/50 resize-y"
              placeholder="Type your notes here… follow-up, preferences, next steps, etc."
              autoFocus
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button
                type="button"
                onClick={() => {
                  setNotesEditId(null);
                  setNotesValue("");
                }}
                className="px-4 py-2 rounded-lg border border-white/20 text-sm hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateLead(notesEditId, { notes: notesValue.trim() || null })}
                disabled={updatingId === notesEditId}
                className="px-4 py-2 rounded-lg bg-accent-lime text-black font-medium text-sm hover:bg-accent-lime/90 disabled:opacity-50"
              >
                {updatingId === notesEditId ? "Saving…" : "Save"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
