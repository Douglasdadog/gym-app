"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";

type Thread = {
  sender_id: string;
  channel: "messenger" | "instagram";
  last_message: string;
  last_role: "user" | "assistant";
  last_at: string;
  message_count: number;
};

type Message = {
  sender_id: string;
  channel: string | null;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export default function AdminInboxPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");

  const selectedKey = useMemo(
    () => (selected ? `${selected.channel}:${selected.sender_id}` : ""),
    [selected]
  );

  useEffect(() => {
    const load = async () => {
      setLoadingThreads(true);
      try {
        const res = await fetchWithTimeout("/api/admin/inbox", { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch threads");
        setThreads(data.threads ?? []);
        if (!selected && data.threads?.length) setSelected(data.threads[0]);
      } catch {
        setThreads([]);
      } finally {
        setLoadingThreads(false);
      }
    };
    load();
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const qs = new URLSearchParams({
          sender_id: selected.sender_id,
          channel: selected.channel,
        });
        const res = await fetchWithTimeout(`/api/admin/inbox?${qs.toString()}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch messages");
        setMessages(data.messages ?? []);
      } catch {
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };
    loadMessages();
  }, [selectedKey, selected]);

  const sendReply = async () => {
    if (!selected || !draft.trim() || sending) return;
    const text = draft.trim();
    setSending(true);
    try {
      const res = await fetchWithTimeout("/api/admin/inbox", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_id: selected.sender_id,
          channel: selected.channel,
          text,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Failed to send");
      setDraft("");
      setMessages((prev) => [
        ...prev,
        {
          sender_id: selected.sender_id,
          channel: selected.channel,
          role: "assistant",
          content: text,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 h-[calc(100vh-120px)] flex flex-col overflow-hidden">
      <h1 className="text-2xl sm:text-3xl font-bold">Inbox (Messenger + Instagram)</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 flex-1 min-h-0">
        <div className="glass rounded-2xl border border-white/10 p-3 h-full overflow-y-auto">
          <h2 className="text-sm font-semibold text-white/80 mb-2">Threads</h2>
          {loadingThreads ? (
            <div className="py-6 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-accent-lime" />
            </div>
          ) : threads.length === 0 ? (
            <p className="text-sm text-white/50 py-6 text-center">No conversations yet.</p>
          ) : (
            <div className="space-y-2">
              {threads.map((t) => {
                const key = `${t.channel}:${t.sender_id}`;
                const active = key === selectedKey;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelected(t)}
                    className={`w-full text-left rounded-xl px-3 py-2 border transition ${
                      active
                        ? "bg-accent-lime/20 border-accent-lime/40"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span
                        className={`px-2 py-0.5 rounded-full ${
                          t.channel === "instagram"
                            ? "bg-pink-500/20 text-pink-300"
                            : "bg-blue-500/20 text-blue-300"
                        }`}
                      >
                        {t.channel === "instagram" ? "Instagram" : "Messenger"}
                      </span>
                      <span className="text-white/50">{new Date(t.last_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-white/60">Sender: {t.sender_id.slice(0, 12)}...</p>
                    <p className="text-sm text-white/90 truncate mt-1">{t.last_message}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl border border-white/10 p-4 flex flex-col h-full min-h-0">
          {!selected ? (
            <p className="text-white/50 text-sm">Select a thread to view messages.</p>
          ) : (
            <>
              <div className="pb-3 border-b border-white/10">
                <p className="text-sm font-semibold">
                  {selected.channel === "instagram" ? "Instagram" : "Messenger"} • {selected.sender_id}
                </p>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-2">
                {loadingMessages ? (
                  <div className="py-6 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-accent-lime" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-white/50 text-sm py-6 text-center">No messages in this thread yet.</p>
                ) : (
                  messages.map((m, idx) => (
                    <div
                      key={`${m.created_at}-${idx}`}
                      className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                        m.role === "assistant"
                          ? "ml-auto bg-accent-lime/20 border border-accent-lime/40"
                          : "bg-white/10 border border-white/10"
                      }`}
                    >
                      <p>{m.content}</p>
                      <p className="text-[11px] text-white/50 mt-1">
                        {m.role === "assistant" ? "Bot/Admin" : "User"} •{" "}
                        {new Date(m.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
              <div className="pt-3 border-t border-white/10 flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a reply..."
                  className="flex-1 h-11 px-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-accent-lime/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      sendReply();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={sendReply}
                  disabled={sending || !draft.trim()}
                  className="h-11 px-4 rounded-xl bg-accent-lime text-black font-medium text-sm hover:bg-accent-lime/90 disabled:opacity-50 inline-flex items-center gap-1"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

