"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Evidence } from "@/lib/types";

const Ctx = createContext<{ open: (e: Evidence) => void }>({ open: () => {} });
export const useEvidence = () => useContext(Ctx);

export function EvidenceProvider({ children }: { children: React.ReactNode }) {
  const [ev, setEv] = useState<Evidence | null>(null);
  const open = useCallback((e: Evidence) => setEv(e), []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setEv(null);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  return (
    <Ctx.Provider value={{ open }}>
      {children}
      <div className={`fixed inset-0 z-40 bg-black/10 transition-opacity duration-200 ${ev ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setEv(null)} />
      <aside
        aria-hidden={!ev}
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-[400px] border-l border-line bg-panel p-6 shadow-sm transition-transform duration-200 ${ev ? "translate-x-0" : "translate-x-full"}`}
      >
        {ev && (
          <div className="flex h-full flex-col gap-6 overflow-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-muted">Evidence</span>
              <button onClick={() => setEv(null)} className="text-sm text-muted hover:text-foreground">Close</button>
            </div>
            <Field label="Relationship" value={ev.relationship} big />
            {ev.rows.map((r) => <Field key={r.label} label={r.label} value={r.value} />)}
            <Field label="Source" value={ev.provenance.source} />
            {ev.provenance.version && <Field label="Source version" value={ev.provenance.version} />}
            {ev.provenance.externalId && <Field label="Source record" value={ev.provenance.externalId} mono />}
            <div>
              <div className="text-xs text-muted">External source</div>
              {ev.provenance.url
                ? <a className="text-accent underline" href={ev.provenance.url} target="_blank" rel="noreferrer">Open source record</a>
                : <div className="text-sm text-muted">No link in demo data.</div>}
            </div>
            {ev.provenance.note && <p className="rounded-md bg-accent-soft p-3 text-xs text-accent">{ev.provenance.note}</p>}
          </div>
        )}
      </aside>
    </Ctx.Provider>
  );
}
function Field({ label, value, big, mono }: { label: string; value: string; big?: boolean; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className={`${big ? "text-lg font-medium leading-snug" : "text-sm"} ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

export function EvidenceButton({ evidence, label = "Evidence" }: { evidence: Evidence; label?: string }) {
  const { open } = useEvidence();
  return (
    <button onClick={(e) => { e.stopPropagation(); open(evidence); }} className="text-xs text-muted underline decoration-line underline-offset-2 hover:text-accent">
      {label}
    </button>
  );
}
