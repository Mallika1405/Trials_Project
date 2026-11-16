"use client";
import Link from "next/link";
import { useState } from "react";
import MoleculeViewer from "./MoleculeViewer";
import { EvidenceButton } from "./Evidence";
import { CopyButton, Empty, Meta, PageIntro, Section, SectionNav, StatusPill, Term, TypeTag } from "./ui";
import type { Activity, Compound, Gene, Mutation, ResistanceEdge, Trial } from "@/lib/types";
import { expandClassification, withVia } from "@/lib/format";

type Res = { gene: Gene; mutation: Mutation; edge: ResistanceEdge };

export default function CompoundView({
  compound, activities, resistance, trials, genes, via,
}: { compound: Compound; activities: Activity[]; resistance: Res[]; trials: Trial[]; genes: Gene[]; via: string[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const isDrug = compound.entityClass === "clinical_drug";
  const nextVia = [...via, compound.name];
  return (
    <>
      <div className="grid gap-10 py-10 md:grid-cols-2">
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <h1 className="text-5xl font-semibold tracking-tight">{compound.name}</h1>
            <TypeTag type={isDrug ? "drug" : "compound"} />
          </div>
          <p className="mt-2 text-xl text-muted">{compound.tagline}</p>
          <PageIntro>
            {isDrug
              ? <>This is a <b className="font-medium text-foreground">drug</b>: a compound used to treat tuberculosis. Below: how potent it is in lab tests, which gene mutations are linked to resistance against it, and the clinical trials that tested it.</>
              : <>This is an <b className="font-medium text-foreground">experimental compound</b>, not an approved drug. Below: its lab measurements and structure.</>}
          </PageIntro>
          <p className="mt-5 text-xs text-muted">ChEMBL {compound.chemblId} · PubChem CID {compound.pubchemCid}</p>
          {compound.synonyms.length > 0 && <p className="mt-4 text-sm">{compound.synonyms.join(" · ")}</p>}
          <p className="mt-1 text-sm text-muted">{compound.formula} · {compound.molecularWeight}</p>
          <div className="mt-8">
            <Link href={`/graph?type=compound&id=${compound.id}`} className="inline-block rounded-lg bg-foreground px-4 py-2 text-sm text-background hover:opacity-90">Explore relationships</Link>
          </div>
        </div>
        <MoleculeViewer seed={compound.name.length} />
      </div>

      <div className="rounded-xl border border-line px-5 py-4 text-sm">
        <div className="text-xs text-muted">Continue exploring</div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          {genes.slice(0, 4).map((g) => (
            <Link key={g.id} href={withVia(`/gene/${g.id}`, nextVia)} className="text-accent hover:underline">Target: {g.name} →</Link>
          ))}
          {trials.length > 0 && <a href="#trials" className="text-accent hover:underline">{trials.length} clinical trial{trials.length === 1 ? "" : "s"} ↓</a>}
          <Link href={`/graph?type=compound&id=${compound.id}`} className="text-accent hover:underline">See the relationship map →</Link>
        </div>
      </div>

      <SectionNav items={[{ id: "overview", label: "Overview" }, { id: "activity", label: "Activity" }, { id: "resistance", label: "Resistance" }, { id: "trials", label: "Trials" }]} />

      <Section id="overview" title="Overview" hint="Identity of the molecule: names, formula and the codes used to look it up elsewhere.">
        <Meta k="Preferred name">{compound.name}</Meta>
        <Meta k="Classification">{isDrug ? "Clinical drug" : compound.entityClass === "experimental_compound" ? "Experimental compound (not a drug)" : "Unknown"}</Meta>
        <Meta k="Synonyms">{compound.synonyms.join(", ") || "—"}</Meta>
        <Meta k="Formula">{compound.formula}</Meta>
        <Meta k="Molecular weight">{compound.molecularWeight}</Meta>
        <Meta k="SMILES"><span className="font-mono text-xs">{compound.smiles}</span> <CopyButton value={compound.smiles} /></Meta>
        <Meta k="InChIKey"><span className="font-mono text-xs">{compound.inchikey}</span> <CopyButton value={compound.inchikey} /></Meta>
      </Section>

      <Section id="activity" title="Activity" hint="Lab measurements of how strongly this compound acts on the bacterium or a target. Click a row to see the assay and where it came from.">
        {activities.length === 0 ? <Empty>No ChEMBL activity records found.</Empty> : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {activities.map((a) => (
              <li key={a.id}>
                <button onClick={() => setOpen(open === a.id ? null : a.id)} className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3 text-left hover:bg-accent-soft/50">
                  <span>{a.target}</span>
                  <span className="text-sm"><span className="text-muted"><Term>{a.type}</Term></span> {a.value} {a.units}</span>
                  <span className="text-xs text-muted">{open === a.id ? "−" : "+"}</span>
                </button>
                {open === a.id && (
                  <div className="fade-up grid gap-1 border-t border-line bg-background px-4 py-3 text-sm text-muted">
                    <div>Assay: <span className="text-foreground">{a.assay}</span></div>
                    <div>Source: <span className="text-foreground">{a.provenance.source}</span> · document {a.provenance.externalId}</div>
                    <div><EvidenceButton label="Open evidence" evidence={{
                      relationship: `${compound.name} → ${a.target}`,
                      rows: [{ label: "Measurement", value: `${a.type} ${a.value} ${a.units}` }, { label: "Assay", value: a.assay }],
                      provenance: a.provenance,
                    }} /></div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="resistance" title="Resistance" hint="Gene mutations the WHO catalogue links to resistance against this drug. Click a gene to open it, or a mutation to see it on the protein.">
        {resistance.length === 0 ? <Empty>WHO resistance data isn&apos;t loaded in this portal yet, so no resistance mutations are shown for this compound.</Empty> : (
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr><th className="px-4 py-2 font-normal">Gene</th><th className="px-4 py-2 font-normal"><Term>Mutation</Term></th><th className="px-4 py-2 font-normal"><Term>WHO classification</Term></th><th /></tr>
              </thead>
              <tbody>
                {resistance.map(({ gene, mutation, edge }) => {
                  const rel = `${gene.name} ${mutation.display} → ${compound.name} resistance`;
                  const v = [...via, rel];
                  return (
                    <tr key={mutation.id + edge.drugId} className="border-b border-line last:border-0">
                      <td className="px-4 py-3"><Link className="text-accent hover:underline" href={withVia(`/gene/${gene.id}`, via)}>{gene.name}</Link></td>
                      <td className="px-4 py-3"><Link className="font-medium hover:text-accent" href={withVia(`/gene/${gene.id}?mutation=${mutation.id}`, v)}>{mutation.display}</Link></td>
                      <td className="px-4 py-3" title={edge.classification}>{expandClassification(edge.classification)}</td>
                      <td className="px-4 py-3 text-right"><EvidenceButton evidence={{
                        relationship: rel,
                        rows: [{ label: "Classification", value: edge.classification }, { label: "Original notation", value: mutation.original }],
                        provenance: edge.provenance,
                      }} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section id="trials" title="Trials" hint="Human clinical studies (ClinicalTrials.gov) where this drug is one of the treatments tested.">
        {trials.length === 0 ? <Empty>No relevant clinical trials found.</Empty> : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {trials.map((t) => (
              <li key={t.nctId}>
                <Link href={withVia(`/trial/${t.nctId}`, nextVia)} className="flex flex-col gap-1 px-4 py-4 hover:bg-accent-soft/50">
                  <span className="text-xs text-muted">{t.phase} · {t.nctId}</span>
                  <span className="font-medium">{t.title}</span>
                  <span className="flex items-center gap-3 text-sm text-muted"><StatusPill status={t.status} /> {t.enrollment} participants</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
