"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchHit } from "@/lib/types";
import { TYPE_LABEL } from "@/lib/format";

export default function SearchBox({ large = false, autoFocus = false }: { large?: boolean; autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/INPUT|TEXTAREA/.test(t.tagName)) { e.preventDefault(); input.current?.focus(); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  useEffect(() => {
    if (!q.trim()) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const j = await r.json();
        setHits((j.results as SearchHit[]).slice(0, 7)); setSel(0);
      } catch { /* aborted or offline: keep previous */ }
    }, 120);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  const shown = q.trim() ? hits : [];
  const go = (h?: SearchHit) => {
    setOpen(false);
    if (h) router.push(h.href);
    else if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="relative w-full">
      <input
        ref={input} autoFocus={autoFocus} value={q} spellCheck={false}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
          else if (e.key === "Enter") {
            // Ambiguous (several meaningful matches with no exact winner) -> results page.
            go(hits.length === 1 || (hits[0] && hits[0].title.toLowerCase() === q.trim().toLowerCase()) ? hits[sel] : undefined);
          } else if (e.key === "Escape") { setOpen(false); input.current?.blur(); }
        }}
        placeholder={large ? "Try Rv0678, rpoB, MmpL3, bedaquiline..." : "Search gene, protein, compound, drug..."}
        aria-label="Search"
        className={`w-full border border-line bg-panel outline-none transition-colors placeholder:text-muted/70 focus:border-foreground ${large ? "rounded-xl px-5 py-4 text-lg" : "rounded-lg px-3 py-1.5 text-sm"}`}
      />
      {!large && <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-line px-1.5 text-xs text-muted">/</kbd>}
      {open && q.trim() && (
        <ul className="fade-up absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-line bg-panel shadow-sm">
          {shown.length === 0 && <li className="px-4 py-3 text-sm text-muted">No matches</li>}
          {shown.map((h, i) => (
            <li key={h.href}>
              <button
                onMouseDown={(e) => { e.preventDefault(); go(h); }} onMouseEnter={() => setSel(i)}
                className={`flex w-full items-baseline justify-between gap-4 px-4 py-2.5 text-left ${i === sel ? "bg-accent-soft" : ""}`}
              >
                <span>
                  <span className="block font-medium">{h.title}</span>
                  <span className="block text-xs text-muted">{h.hint ?? h.subtitle}</span>
                </span>
                <span className="shrink-0 text-xs text-muted">{TYPE_LABEL[h.type]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
