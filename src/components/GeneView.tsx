"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import ProteinViewer from "./ProteinViewer";
import { EvidenceButton } from "./Evidence";
import { Empty, Meta, PageIntro, Section, SectionNav, Term, TypeTag } from "./ui";
import MoleculeThumb from "./MoleculeThumb";
import type { Activity, Compound, Gene, Mutation } from "@/lib/types";
import { expandClassification, withVia } from "@/lib/format";

export default function GeneView({
  gene, compounds, activities, drugNames, initialMutation,
}: {
  gene: Gene; compounds: Compound[]; activities: Activity[];
  drugNames: Record<string, string>; initialMutation?: string;
}) {
  const [selected, setSelected] = useState<string | null>(initialMutation ?? null);
  const [sort, setSort] = useState<"name" | "type" | "value">("type");
  const [showAll, setShowAll] = useState(false);
  const detail = useRef<HTMLDivElement>(null);
  const mutation: Mutation | undefined = gene.mutations.find((m) => m.id === selected);
  const highlight = mutation?.position ? { position: mutation.position, label: mutation.display } : null;

  const select = (m: Mutation) => {
    setSelected(m.id === selected ? null : m.id);
    setTimeout(() => detail.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
  };

  // Rows are per (compound, activity type): unlike measurement types are never merged or ranked together.
  const rows = activities
    .map((a) => ({ a, c: compounds.find((c) => c.id === a.compoundId)! }))
    .filter((r) => r.c)
    .sort((x, y) =>
      sort === "name" ? x.c.name.localeCompare(y.c.name)
      : sort === "type" ? x.a.type.localeCompare(y.a.type) || x.c.name.localeCompare(y.c.name)
      : x.a.type.localeCompare(y.a.type) || x.a.value - y.a.value);
  const visible = showAll ? rows : rows.slice(0, 10);

  return (
    <>
      <div className="grid gap-10 py-10 md:grid-cols-2">
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <h1 className="text-5xl font-semibold tracking-tight">{gene.name}</h1><TypeTag type="gene" />
          </div>
          <p className="mt-2 text-xl text-muted">{gene.proteinName}</p>
          <PageIntro>
            This is a <b className="font-medium text-foreground">gene</b>: a stretch of the bacterium&apos;s DNA that codes for the protein above.
            Drugs act on proteins, and mutations in the gene can make a drug stop working.
            Scroll to see its resistance mutations, compounds tested against it, and its 3D structure.
          </PageIntro>
          <p className="mt-5 text-xs text-muted">{gene.organism} · UniProt {gene.uniprot}</p>
          <div className="mt-8 flex gap-3">
            <Link href={`/graph?type=gene&id=${gene.id}`} className="rounded-lg bg-foreground px-4 py-2 text-sm text-background hover:opacity-90">Explore relationships</Link>
          </div>
        </div>
        <ProteinViewer structure={gene.structure} uniprot={gene.uniprot} highlight={highlight} onClear={() => setSelected(null)} />
      </div>

      <div className="rounded-xl border border-line px-5 py-4 text-sm">
        <div className="text-xs text-muted">Continue exploring</div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          {compounds.slice(0, 4).map((c) => (
            <Link key={c.id} href={withVia(`/compound/${c.id}`, [gene.name])} className="text-accent hover:underline">{c.name} →</Link>
          ))}
          {compounds.length === 0 && <span className="text-muted">No tested compounds for this gene in the current data.</span>}
          <Link href={`/graph?type=gene&id=${gene.id}`} className="text-accent hover:underline">See the relationship map →</Link>
        </div>
      </div>

      <SectionNav items={[{ id: "overview", label: "Overview" }, { id: "resistance", label: "Resistance" }, { id: "compounds", label: "Compounds" }, { id: "structure", label: "Structure" }]} />

      <Section id="overview" title="Overview" hint="Who this gene and protein are. Identity comes from UniProt.">
        <Meta k="Function">{gene.function}</Meta>
        <Meta k="Protein name">{gene.proteinName}</Meta>
        <Meta k="Gene aliases">{gene.aliases.join(", ") || "—"}</Meta>
        <Meta k="Locus tag">{gene.locusTag}</Meta>
        <Meta k="Protein length">{gene.length} aa</Meta>
        <Meta k="UniProt">{gene.uniprot}</Meta>
      </Section>

      <Section id="resistance" title="Resistance" hint="Mutations in this gene that the WHO catalogue has classified against a drug. Click a row to see where that position sits on the protein (top right). Position alone does not prove it causes resistance.">
        {gene.mutations.length === 0 ? <Empty>WHO resistance data isn&apos;t loaded in this portal yet, so no resistance mutations are shown for this gene.</Empty> : (
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr><th className="px-4 py-2 font-normal"><Term>Mutation</Term></th><th className="px-4 py-2 font-normal">Drug it affects</th><th className="px-4 py-2 font-normal"><Term>WHO classification</Term></th><th /></tr>
              </thead>
              <tbody>
                {gene.mutations.flatMap((m) => m.resistance.map((r) => (
                  <tr key={m.id + r.drugId} onClick={() => select(m)}
                    className={`cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-accent-soft/50 ${selected === m.id ? "bg-accent-soft" : ""}`}>
                    <td className="px-4 py-3 font-medium">{m.display}</td>
                    <td className="px-4 py-3">
                      <Link onClick={(e) => e.stopPropagation()} className="text-accent hover:underline"
                        href={withVia(`/compound/${r.drugId}`, [gene.name, `${gene.name} ${m.display} → ${drugNames[r.drugId]} resistance`])}>
                        {drugNames[r.drugId]}
                      </Link>
                    </td>
                    <td className="px-4 py-3" title={r.classification}>{expandClassification(r.classification)}</td>
                    <td className="px-4 py-3 text-right">
                      <EvidenceButton evidence={{
                        relationship: `${gene.name} ${m.display} → ${drugNames[r.drugId]} resistance`,
                        rows: [{ label: "Classification", value: r.classification }, { label: "Original notation", value: m.original }],
                        provenance: r.provenance,
                      }} />
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        )}
        <div ref={detail}>
          {mutation && (
            <div className="fade-up mt-4 rounded-xl border border-line p-5 text-sm">
              <div className="flex items-baseline justify-between">
                <div className="text-lg font-medium">{gene.name} {mutation.display}</div>
                <button onClick={() => setSelected(null)} className="text-xs text-muted hover:text-foreground">Clear selection</button>
              </div>
              <div className="mt-3 grid gap-x-8 gap-y-1 text-muted sm:grid-cols-2">
                <div>Original notation: <span className="text-foreground">{mutation.original}</span></div>
                <div>Change: <span className="text-foreground">{mutation.refAa} → {mutation.altAa} at residue {mutation.position}</span></div>
              </div>
              <p className="mt-3 text-xs text-muted">The highlighted residue is the wild-type position only. Position does not imply a structural cause of resistance.</p>
            </div>
          )}
        </div>
      </Section>

      <Section id="compounds" title="Compounds" hint="Compounds with lab measurements against this target (from ChEMBL). Each row is one measurement. Different measurement types (MIC, IC50…) can't be compared, so they're grouped, never ranked together.">
        {rows.length === 0 ? <Empty>No ChEMBL activity records for this target in the prototype data.</Empty> : (
          <>
            <div className="mb-3 flex items-center gap-2 text-xs text-muted">
              Sort
              {(["type", "name", "value"] as const).map((s) => (
                <button key={s} onClick={() => setSort(s)} className={`rounded-md border px-2 py-1 ${sort === s ? "border-accent text-accent" : "border-line hover:border-foreground"}`}>
                  {s === "type" ? "Measurement type" : s === "name" ? "Compound name" : "Activity (within type)"}
                </button>
              ))}
            </div>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {visible.map(({ a, c }) => (
                <li key={a.id}>
                  <Link href={withVia(`/compound/${c.id}`, [gene.name])} className="flex items-center gap-4 px-4 py-3 hover:bg-accent-soft/50">
                    <MoleculeThumb seed={c.name.length} />
                    <span className="flex-1 font-medium">{c.name}</span>
                    <span className="text-sm"><span className="text-muted"><Term>{a.type}</Term></span> {a.value} {a.units}</span>
                    <span className="w-16 text-right text-xs text-muted">ChEMBL</span>
                    <EvidenceButton evidence={{
                      relationship: `${c.name} → ${a.target}`,
                      rows: [{ label: "Measurement", value: `${a.type} ${a.value} ${a.units}` }, { label: "Assay", value: a.assay }],
                      provenance: a.provenance,
                    }} />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between text-xs text-muted">
              <span>{showAll ? `All ${rows.length} records` : `Top ${Math.min(10, rows.length)} records`}. Different measurement types are never ranked against each other.</span>
              {rows.length > 10 && <button className="underline" onClick={() => setShowAll((s) => !s)}>{showAll ? "Show fewer" : "View all"}</button>}
            </div>
          </>
        )}
      </Section>

      <Section id="structure" title="Structure" hint="The 3D shape of the protein. An experimental structure was measured in a lab; a predicted one is a computer model.">
        <Meta k="Type">{gene.structure.kind === "experimental" ? "Experimental structure" : gene.structure.kind === "predicted" ? "Predicted structure" : "None"}</Meta>
        <Meta k="Source">{gene.structure.source} {gene.structure.id}</Meta>
        {gene.structure.method && <Meta k="Method">{gene.structure.method}, {gene.structure.resolution}</Meta>}
        {gene.structure.kind === "predicted" && <Meta k="Note">No experimentally determined structure found. Showing AlphaFold prediction.</Meta>}
      </Section>
    </>
  );
}
