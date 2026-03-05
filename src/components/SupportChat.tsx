\"use client\";

import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

export function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      content:
        "Hey! I’m your Cyber-Gym assistant. Ask me about memberships, bookings, trainers, or how the app works.",
    },
  ]);
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const nextId = messages.length ? messages[messages.length - 1].id + 1 : 1;
    const userMessage: ChatMessage = {
      id: nextId,
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({
              role: m.role,
              content: m.content,
            }))
            .concat({ role: "user", content: trimmed }),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      const data = (await res.json()) as { reply?: string };
      const assistantContent =
        data.reply ??
        "Sorry, I couldn’t reach the assistant service. Please try again later.";

      setMessages((prev) => [
        ...prev,
        {
          id: prev[prev.length - 1]?.id + 1 || nextId + 1,
          role: "assistant",
          content: assistantContent,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: prev[prev.length - 1]?.id + 1 || nextId + 1,
          role: "assistant",
          content:
            "Something went wrong while sending your message. Please try again in a moment.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-accent-lime text-black flex items-center justify-center shadow-lg glow-lime border border-black/10"
        aria-label={isOpen ? "Close support chat" : "Open support chat"}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-80 sm:w-96 rounded-2xl glass shadow-xl border border-white/15 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-black/40">
            <div>
              <p className="text-sm font-semibold">Cyber-Gym Assistant</p>
              <p className="text-xs text-white/60">
                Ask about memberships, trainers, or bookings.
              </p>
            </div>
            <span className="h-2 w-2 rounded-full bg-accent-lime animate-pulse" />
          </div>

          <div className="px-3 py-3 space-y-2 max-h-72 overflow-y-auto text-sm">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                    m.role === "user"
                      ? "bg-accent-lime text-black"
                      : "bg-white/5 text-white/90"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-3 py-2 bg-white/5 text-xs text-white/70">
                  Typing…
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-black/40 px-3 py-2">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask a question..."
                className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-white/40 max-h-24"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending || !input.trim()}
                className="p-2 rounded-full bg-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-1 text-[10px] text-white/40">
              For general guidance only. Not medical advice.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

