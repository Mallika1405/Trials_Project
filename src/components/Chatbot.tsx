"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };
const START: Msg = {
  role: "assistant",
  content: "Hi! I'm here to help you explore TB genes, drugs and trials. What are you curious about?",
};
const SUGGESTIONS = ["I study a gene. Where do I start?", "I'm screening drugs. What can I see?", "Show me a drug with clinical trials"];

function inline(text: string, key: number) {
  return text.split(/(\[[^\]]+\]\(\/[^)\s]*\)|\*\*[^*]+\*\*)/g).map((p, i) => {
    const l = p.match(/^\[([^\]]+)\]\((\/[^)\s]*)\)$/);
    if (l) return <Link key={`${key}-${i}`} href={l[2]} className="text-accent underline">{l[1]}</Link>;
    const b = p.match(/^\*\*([^*]+)\*\*$/);
    return b ? <strong key={`${key}-${i}`}>{b[1]}</strong> : <span key={`${key}-${i}`}>{p}</span>;
  });
}

/** Tiny renderer: paragraphs, "- " bullets, **bold** and internal [links](/path). */
function Rich({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (k: number) => {
    if (bullets.length) blocks.push(<ul key={`u${k}`} className="my-1 list-disc space-y-0.5 pl-5">{bullets.map((b, i) => <li key={i}>{inline(b, i)}</li>)}</ul>);
    bullets = [];
  };
  text.split("\n").forEach((line, k) => {
    const m = line.match(/^\s*[-*] (.*)/);
    if (m) bullets.push(m[1]);
    else { flush(k); if (line.trim()) blocks.push(<p key={k} className="my-1">{inline(line, k)}</p>); }
  });
  flush(999);
  return <>{blocks}</>;
}

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([START]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [msgs, open]);
  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const history = [...msgs, { role: "user" as const, content: q }];
    setMsgs([...history, { role: "assistant", content: "" }]);
    setInput(""); setBusy(true);
    const setLast = (content: string) => setMsgs([...history, { role: "assistant", content }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history.filter((m) => m !== START) }),
      });
      if (!res.ok || !res.body) throw new Error("bad response");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setLast(acc);
      }
      if (!acc.trim()) setLast("Sorry, I didn't get an answer. Could you try asking another way?");
    } catch {
      setLast("Sorry, I couldn't reach the server. Please try again.");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed bottom-5 right-5 z-30">
      {open && (
        <div role="dialog" aria-label="Chat assistant" className="mb-3 flex h-[32rem] w-[24rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-line bg-background shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <div className="text-sm font-medium">Mtb Explorer assistant</div>
              <div className="text-[11px] text-muted">Ask me anything about the portal</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="text-xl leading-none text-muted hover:text-foreground">×</button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm leading-relaxed">
            {msgs.map((m, i) => m.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-foreground px-3.5 py-2 text-background">{m.content}</div>
              </div>
            ) : (
              <div key={i} className="flex justify-start">
                <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-line bg-accent-soft/40 px-3.5 py-2">
                  {m.content ? <Rich text={m.content} /> : (
                    <span className="inline-flex gap-1 py-1" aria-label="Assistant is typing">
                      {[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${d * 150}ms` }} />)}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {msgs.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-line px-3 py-1 text-xs text-muted hover:border-accent hover:text-accent">{s}</button>)}
              </div>
            )}
            <div ref={end} />
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-line p-3">
            <div className="flex gap-2">
              <input ref={field} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message…" className="min-w-0 flex-1 rounded-full border border-line bg-background px-4 py-2 text-sm outline-none focus:border-accent" />
              <button type="submit" disabled={busy || !input.trim()} className="rounded-full bg-foreground px-4 py-2 text-sm text-background disabled:opacity-40">Send</button>
            </div>
            <p className="mt-2 px-1 text-[10px] text-muted">Navigation and background help only, not medical advice. Answers can be wrong, so check the source pages.</p>
          </form>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} className="ml-auto block rounded-full bg-foreground px-4 py-2.5 text-sm text-background shadow-lg hover:opacity-90">
        {open ? "Close" : "Chat with us"}
      </button>
    </div>
  );
}
