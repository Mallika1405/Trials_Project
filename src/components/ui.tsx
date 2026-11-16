"use client";
import { useState } from "react";
import { TYPE_LABEL } from "@/lib/format";
import type { EntityType } from "@/lib/types";

export function TypeTag({ type }: { type: EntityType }) {
  return <span className="rounded-full border border-line px-2 py-0.5 text-xs text-muted">{TYPE_LABEL[type]}</span>;
}

const STATUS: Record<string, string> = {
  Completed: "bg-neutral-100 text-neutral-700",
  Recruiting: "bg-accent-soft text-accent",
  "Active, not recruiting": "bg-amber-50 text-amber-800",
  Terminated: "bg-red-50 text-red-700",
};
export function StatusPill({ status }: { status: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS[status] ?? "bg-neutral-100"}`}>{status}</span>;
}

export function CopyButton({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => { try { await navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1200); } catch {} }}
      className="rounded border border-line px-1.5 py-0.5 text-xs text-muted hover:border-foreground hover:text-foreground"
    >{ok ? "Copied" : "Copy"}</button>
  );
}

export function SectionNav({ items }: { items: { id: string; label: string }[] }) {
  return (
    <nav className="sticky top-14 z-10 -mx-6 border-b border-line bg-background/90 px-6 backdrop-blur">
      <ul className="flex gap-6 text-sm">
        {items.map((i) => (
          <li key={i.id}><a href={`#${i.id}`} className="block border-b-2 border-transparent py-3 text-muted hover:text-foreground">{i.label}</a></li>
        ))}
      </ul>
    </nav>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line px-4 py-6 text-sm text-muted">{children}</p>;
}

export function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="py-10">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {hint && <p className="mb-5 mt-1 max-w-2xl text-sm text-muted">{hint}</p>}
      {!hint && <div className="mb-5" />}
      {children}
    </section>
  );
}

export function Meta({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 border-b border-line py-3 text-sm last:border-0">
      <div className="text-muted">{k}</div><div className="break-words">{children}</div>
    </div>
  );
}

const GLOSSARY: Record<string, string> = {
  MIC: "Minimum inhibitory concentration: the lowest dose that stops bacterial growth in a lab test. Lower = more potent.",
  MIC90: "MIC that stops growth of 90% of tested isolates.",
  IC50: "Concentration that reduces a target's activity by half in a lab assay. Lower = more potent.",
  EC50: "Concentration giving half of the maximum effect.",
  Ki: "Inhibition constant: how tightly a compound binds its target. Lower = tighter.",
  "WHO classification": "How strongly the WHO catalogue links this mutation to resistance, in WHO's own wording.",
  Residue: "One amino-acid position in the protein chain.",
  Mutation: "A change in the gene. R94W means the amino acid arginine (R) at position 94 is replaced by tryptophan (W).",
};
export function Term({ children, term }: { children: React.ReactNode; term?: string }) {
  const key = term ?? (typeof children === "string" ? children : "");
  const def = GLOSSARY[key];
  if (!def) return <>{children}</>;
  return <abbr title={def} className="cursor-help underline decoration-line decoration-dotted underline-offset-4">{children}</abbr>;
}

/** One plain sentence saying what kind of thing this page is and how it fits the bigger picture. */
export function PageIntro({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 max-w-md border-l-2 border-accent pl-3 text-sm text-muted">{children}</p>;
}
