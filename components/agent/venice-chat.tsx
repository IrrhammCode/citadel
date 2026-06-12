"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function VeniceChat({ systemId, systemName }: { systemId: string; systemName: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hello. I am the Venice-powered AI CFO for ${systemName}. Ask me anything about budget, risk, performance, or recommended actions.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const systemContext = `You are the autonomous treasury intelligence layer for Citadel.
You have deep knowledge of zero-trust agent systems, ERC-7715 permissions, on-chain treasury operations, and risk management.
Current context: Agent "${systemName}" (${systemId}).
Be concise, professional, and data-driven. When appropriate, reference budget, KPIs, trust scores, and compliance.`;

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/venice/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          systemContext,
        }),
      });

      if (!res.ok) throw new Error("Chat request failed");

      const data = await res.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.message || "I encountered an issue generating a response.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, the Venice intelligence layer is temporarily unavailable. Please try again shortly.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <Card className="flex h-[420px] flex-col border-[--border-default] bg-[--canvas-elevated]">
      <CardHeader className="border-b border-[--border-subtle] py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-[--brand-primary]" />
          Ask Venice AI CFO
          <span className="ml-auto text-[10px] font-mono text-[--text-muted] tracking-widest">POWERED BY VENICE</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 text-sm space-y-3 custom-scroll">
        <AnimatePresence initial={false}>
          {messages.map((m, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-2 rounded-lg p-3",
                m.role === "user"
                  ? "bg-[--brand-glow] ml-6"
                  : "bg-[--canvas] border border-[--border-subtle] mr-6"
              )}
            >
              <div className="mt-0.5 shrink-0">
                {m.role === "user" ? (
                  <User className="h-4 w-4 text-[--brand-primary]" />
                ) : (
                  <Bot className="h-4 w-4 text-[--brand-primary]" />
                )}
              </div>
              <div className="whitespace-pre-wrap leading-relaxed text-[--text-primary]">{m.content}</div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <div className="flex items-center gap-2 text-[--text-secondary] pl-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Venice is thinking...
          </div>
        )}
      </CardContent>

      <div className="border-t border-[--border-subtle] p-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about budget, risk, KPIs, or next actions..."
            className="flex-1 bg-[--canvas] border-[--border-default] text-sm"
            disabled={loading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            size="sm"
            className="px-4"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-[--text-muted]">Real-time conversational intelligence powered by Venice AI</p>
      </div>
    </Card>
  );
}
