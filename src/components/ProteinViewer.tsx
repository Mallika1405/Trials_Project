"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { StructureInfo } from "@/lib/types";

export interface Highlight { position: number; label: string }

type Status = "loading" | "ready" | "error";
type Viewer = {
  clear(): void; addModel(data: string, fmt: string): unknown; setStyle(sel: object, style: object): void;
  addStyle(sel: object, style: object): void; addSurface(type: unknown, style: object, sel?: object): unknown;
  removeAllSurfaces(): void; removeAllLabels(): void; addLabel(text: string, opts: object, sel?: object): unknown;
  zoomTo(sel?: object): void; render(): void; spin(on: boolean | string, speed?: number): void; resize(): void;
};

/** Experimental structures come from RCSB PDB (CC0); predicted ones from AlphaFold DB (CC BY 4.0).
 *  Files are fetched by the visitor's browser at view time. Nothing is stored or re-hosted by this site. */
async function structureSource(s: StructureInfo, uniprot?: string): Promise<{ url: string; fmt: "cif" | "pdb" } | null> {
  if (s.kind === "experimental" && s.id) return { url: `https://files.rcsb.org/download/${s.id}.cif`, fmt: "cif" };
  if (s.kind === "predicted" && uniprot) {
    const r = await fetch(`https://alphafold.ebi.ac.uk/api/prediction/${encodeURIComponent(uniprot)}`);
    if (!r.ok) return null;
    const j = await r.json();
    const url = j?.[0]?.pdbUrl;
    return typeof url === "string" && url.startsWith("https://alphafold.ebi.ac.uk/") ? { url, fmt: "pdb" } : null;
  }
  return null;
}

/** Finds which chains of an mmCIF file belong to the given UniProt protein, using the file's own
 *  _struct_ref_seq table (database accession + author chain ID). Returns [] if it can't tell. */
function chainsForUniprot(cif: string, uniprot: string): string[] {
  const want = uniprot.toUpperCase();
  const out = new Set<string>();
  const lines = cif.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== "loop_") continue;
    const heads: string[] = [];
    let j = i + 1;
    while (j < lines.length && lines[j].startsWith("_")) heads.push(lines[j++].trim());
    const acc = heads.indexOf("_struct_ref_seq.pdbx_db_accession");
    const strand = heads.indexOf("_struct_ref_seq.pdbx_strand_id");
    if (acc < 0 || strand < 0) { i = j - 1; continue; }
    let toks: string[] = [];
    for (; j < lines.length && !lines[j].startsWith("#") && !lines[j].startsWith("loop_") && !lines[j].startsWith("_"); j++) {
      toks = toks.concat(lines[j].match(/'[^']*'|"[^"]*"|\S+/g) ?? []);
      while (toks.length >= heads.length) {
        const row = toks.splice(0, heads.length);
        if (row[acc].toUpperCase().startsWith(want)) row[strand].split(",").forEach((c) => out.add(c.trim()));
      }
    }
    break;
  }
  return [...out].filter(Boolean);
}

/** AlphaFold's standard per-residue confidence (pLDDT, stored in the B-factor column) colours. */
const plddtColor = (atom: { b: number }) =>
  atom.b > 90 ? "#0053D6" : atom.b > 70 ? "#65CBF3" : atom.b > 50 ? "#FFDB13" : "#FF7D45";

export default function ProteinViewer({
  structure: base, highlight, onClear, uniprot,
}: { structure: StructureInfo; highlight: Highlight | null; onClear: () => void; uniprot?: string }) {
  // Every protein with a UniProt ID has an AlphaFold prediction, so offer it alongside the lab structure.
  const canToggle = base.kind === "experimental" && !!uniprot;
  const [pref, setPref] = useState<"experimental" | "predicted">(base.kind === "predicted" ? "predicted" : "experimental");
  const structure = useMemo<StructureInfo>(
    () => (pref === "predicted" && uniprot
      ? { kind: "predicted", source: "AlphaFold DB", id: `AF-${uniprot}-F1`, length: base.length }
      : base),
    [pref, uniprot, base],
  );
  const box = useRef<HTMLDivElement>(null);
  const viewer = useRef<Viewer | null>(null);
  const lib = useRef<{ SurfaceType: { VDW: unknown } } | null>(null);
  const [status, setStatus] = useState<Status>(structure.kind === "none" ? "error" : "loading");
  const [mode, setMode] = useState<"cartoon" | "surface">("cartoon");
  const [spinning, setSpinning] = useState(true);
  const [chains, setChains] = useState<string[]>([]);
  const [showAllChains, setShowAllChains] = useState(false);

  // Load the structure once per entry.
  useEffect(() => {
    if (structure.kind === "none") return;
    let cancelled = false;
    const host = box.current;
    (async () => {
      try {
        const [mod, src] = await Promise.all([import("3dmol"), structureSource(structure, uniprot)]);
        if (cancelled || !src || !box.current) throw new Error("no source");
        const res = await fetch(src.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (cancelled || !box.current) return;
        lib.current = mod as unknown as { SurfaceType: { VDW: unknown } };
        const v = (mod as unknown as { createViewer: (el: HTMLElement, c: object) => Viewer })
          .createViewer(box.current, { backgroundColor: "#f4f4f2" });
        v.addModel(text, src.fmt);
        viewer.current = v;
        setChains(src.fmt === "cif" && uniprot ? chainsForUniprot(text, uniprot) : []);
        setShowAllChains(false);
        v.zoomTo();
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; viewer.current?.clear(); viewer.current = null; host?.replaceChildren(); };
  }, [structure, uniprot]);

  // Style, surface, highlight and spin react to the controls.
  useEffect(() => {
    const v = viewer.current;
    if (status !== "ready" || !v) return;
    v.removeAllSurfaces(); v.removeAllLabels();
    // Only draw the chain(s) that are this gene's protein, unless the visitor asks for everything.
    const sel = chains.length > 0 && !showAllChains ? { chain: chains } : {};
    v.setStyle({}, {});
    v.setStyle(sel, { cartoon: structure.kind === "predicted"
      ? { colorfunc: plddtColor, opacity: highlight ? 0.6 : 1 }
      : { color: "spectrum", opacity: highlight ? 0.6 : 1 } });
    if (mode === "surface") v.addSurface(lib.current!.SurfaceType.VDW, { opacity: 0.55, color: "white" }, sel);
    if (highlight) {
      v.addStyle({ ...sel, resi: highlight.position }, { stick: { color: "#0e7490", radius: 0.35 }, sphere: { color: "#0e7490", radius: 1.1 } });
      v.addLabel(highlight.label, { fontSize: 12, fontColor: "#111", backgroundColor: "white", backgroundOpacity: 0.8 }, { ...sel, resi: highlight.position });
    }
    v.spin(spinning && !highlight ? "y" : false, 0.6);
    v.render();
  }, [status, mode, highlight, spinning, structure.kind, chains, showAllChains]);

  // Re-centre when the set of visible chains changes.
  useEffect(() => {
    const v = viewer.current;
    if (status !== "ready" || !v) return;
    v.zoomTo(chains.length > 0 && !showAllChains ? { chain: chains } : {});
    v.render();
  }, [status, chains, showAllChains]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const stop = () => setSpinning(false);
    el.addEventListener("pointerdown", stop); el.addEventListener("wheel", stop, { passive: true });
    const ro = new ResizeObserver(() => viewer.current?.resize()); ro.observe(el);
    return () => { el.removeEventListener("pointerdown", stop); el.removeEventListener("wheel", stop); ro.disconnect(); };
  }, []);

  const af = structure.kind === "predicted";
  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-[360px] flex-1 overflow-hidden rounded-xl border border-line bg-[#f4f4f2]">
        <div ref={box} className="absolute inset-0" aria-label="3D protein structure" />
        {status === "loading" && <div className="absolute inset-0 grid place-items-center text-sm text-muted">Loading structure…</div>}
        {status === "error" && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted">
            {structure.kind === "none" ? "No 3D structure is available for this protein." : "Couldn't load the 3D structure right now. Try again later."}
          </div>
        )}
        <div className="absolute right-3 top-3 z-10 flex gap-1 text-xs">
          <button className="rounded-md border border-line bg-panel px-2 py-1 hover:border-foreground"
            onClick={() => { viewer.current?.zoomTo(); viewer.current?.render(); setSpinning(true); }}>Reset</button>
          {canToggle && (["experimental", "predicted"] as const).map((k) => (
            <button key={k} onClick={() => { if (k !== pref) { setStatus("loading"); setPref(k); setSpinning(true); } }}
              className={`rounded-md border px-2 py-1 ${pref === k ? "border-accent text-accent" : "border-line bg-panel hover:border-foreground"}`}>
              {k === "experimental" ? "Lab structure" : "AlphaFold"}
            </button>
          ))}
          {(["cartoon", "surface"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-md border px-2 py-1 capitalize ${mode === m ? "border-accent text-accent" : "border-line bg-panel hover:border-foreground"}`}>{m}</button>
          ))}
        </div>
        {highlight && (
          <div className="fade-up absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center gap-x-3 rounded-md border border-line bg-panel px-3 py-1.5 text-xs">
            <span><span className="font-medium text-accent">{highlight.label}</span> · residue {highlight.position} highlighted</span>
            <button className="text-muted underline hover:text-foreground" onClick={onClear}>Clear selection</button>
            {!af && <span className="basis-full text-muted">Experimental files can number residues differently from the gene, so check the position.</span>}
          </div>
        )}
      </div>
      <div className="mt-3 space-y-1 text-xs text-muted">
        <p>Drag to rotate · Scroll to zoom</p>
        {chains.length > 0 && structure.kind === "experimental" && (
          <p>
            {showAllChains
              ? "Showing every chain in this entry."
              : `Showing chain${chains.length > 1 ? "s" : ""} ${chains.join(", ")}, the part that matches this gene. Other molecules in the entry are hidden.`}{" "}
            <button className="underline" onClick={() => setShowAllChains((v) => !v)}>{showAllChains ? "Show only this gene" : "Show all chains"}</button>
          </p>
        )}
        {af && (
          <p className="flex flex-wrap items-center gap-x-3">
            Confidence:
            {[["#0053D6", "very high"], ["#65CBF3", "high"], ["#FFDB13", "low"], ["#FF7D45", "very low"]].map(([c, l]) => (
              <span key={l} className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />{l}</span>
            ))}
          </p>
        )}
        {structure.kind === "experimental" && (
          <p>Experimental structure · <a className="underline" target="_blank" rel="noreferrer" href={`https://www.rcsb.org/structure/${structure.id}`}>PDB {structure.id}</a> · {structure.method}, {structure.resolution}.
            Data from the RCSB PDB (CC0); cite as doi:10.2210/pdb{String(structure.id).toLowerCase()}/pdb.</p>
        )}
        {af && (
          <p>Predicted structure · <a className="underline" target="_blank" rel="noreferrer" href={`https://alphafold.ebi.ac.uk/entry/${uniprot ?? ""}`}>AlphaFold DB {structure.id}</a>. A computer prediction, not experimental evidence.
            CC BY 4.0. Cite Jumper et al., <i>Nature</i> 2021 and Varadi et al., <i>Nucleic Acids Res.</i> 2024.</p>
        )}
        <p>Rendered with <a className="underline" target="_blank" rel="noreferrer" href="https://3dmol.csb.pitt.edu">3Dmol.js</a> (BSD-3-Clause).</p>
      </div>
    </div>
  );
}
