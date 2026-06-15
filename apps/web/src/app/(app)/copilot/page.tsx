"use client";

import { useState } from "react";
import { apiSend } from "@/lib/client";

interface Msg {
  role: "user" | "bot";
  text: string;
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "bot", text: "Hi! Ask me about events, leads, ROI, or forecasts." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask() {
    const q = input.trim();
    if (!q || busy) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    try {
      const res = await apiSend<{ answer: string }>("/api/copilot", "POST", { question: q });
      setMessages((m) => [...m, { role: "bot", text: res.answer }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "bot", text: `Error: ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-lg font-bold mb-4">🤖 AI Copilot</h1>
      <div className="card max-w-3xl">
        <div className="flex flex-col gap-3 mb-4 max-h-[460px] overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-surface shrink-0">
                {m.role === "user" ? "👤" : "🤖"}
              </div>
              <div
                className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user" ? "bg-purple text-white" : "bg-surface border border-border"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm"
            placeholder="Which event had the best ROI?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
          />
          <button className="btn btn-primary" onClick={ask} disabled={busy}>
            {busy ? "…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
