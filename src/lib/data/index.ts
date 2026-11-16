// Data access boundary. The UI imports ONLY from here. It reads the snapshot written
// by `npm run ingest` (live.json: UniProt, ChEMBL, PubChem, PDB, AlphaFold DB,
// ClinicalTrials.gov) and falls back to demo.ts when that snapshot is empty. Later
// each function can be re-implemented against a PostgreSQL model without UI changes.
import * as demo from "./demo";
import liveData from "./live.json";
import type {
  Activity, Compound, Gene, GraphEdge, GraphNode, Mutation, ResistanceEdge, SearchHit, Trial,
} from "../types";
import { expandClassification } from "../format";

const live = liveData as unknown as {
  generatedAt: string; genes: Gene[]; compounds: Compound[]; activities: Activity[]; trials: Trial[];
};
const hasLive = live.genes.length > 0;
const { genes, compounds, activities, trials } = hasLive ? live : demo;

export const IS_DEMO = !hasLive;
export const DATA_GENERATED_AT = hasLive ? live.generatedAt : null;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export async function search(q: string): Promise<SearchHit[]> {
  const n = norm(q);
  if (!n) return [];
  const scored: (SearchHit & { score: number })[] = [];
  const consider = (hit: SearchHit, names: string[]) => {
    let best = 0;
    for (const raw of names) {
      const v = norm(raw);
      if (!v) continue;
      const s = v === n ? 100 : v.startsWith(n) ? 60 : v.includes(n) ? 30 : 0;
      best = Math.max(best, s);
    }
    if (best) scored.push({ ...hit, score: best });
  };
  for (const g of genes)
    consider(
      { type: "gene", id: g.id, title: g.name, subtitle: g.proteinName, hint: `${g.locusTag} · UniProt ${g.uniprot}`, href: `/gene/${g.id}` },
      [g.name, g.locusTag, g.uniprot, g.proteinName, ...g.aliases],
    );
  for (const c of compounds)
    consider(
      { type: c.entityClass === "clinical_drug" ? "drug" : "compound", id: c.id, title: c.name, subtitle: c.tagline, hint: `${c.chemblId} · ${c.pubchemCid}`, href: `/compound/${c.id}` },
      [c.name, c.chemblId, c.pubchemCid, ...c.synonyms],
    );
  return scored.sort((a, b) => b.score - a.score).map((h) => ({ type: h.type, id: h.id, title: h.title, subtitle: h.subtitle, hint: h.hint, href: h.href }));
}

export async function getGene(id: string): Promise<Gene | null> {
  const n = norm(id);
  return genes.find((g) => norm(g.id) === n || norm(g.name) === n)
    ?? genes.find((g) => norm(g.locusTag) === n || norm(g.uniprot) === n || g.aliases.some((a) => norm(a) === n))
    ?? null;
}
export async function getCompound(id: string): Promise<Compound | null> {
  return compounds.find((c) => norm(c.id) === norm(id)) ?? null;
}
export async function getTrial(nctId: string): Promise<Trial | null> {
  return trials.find((t) => t.nctId === nctId) ?? null;
}
export async function getTrialsForCompound(c: Compound): Promise<Trial[]> {
  return trials.filter((t) => c.trialIds.includes(t.nctId));
}
export async function getActivities(opts: { compoundId?: string; geneId?: string }): Promise<Activity[]> {
  return activities.filter(
    (a) => (!opts.compoundId || a.compoundId === opts.compoundId) && (!opts.geneId || a.geneId === opts.geneId),
  );
}
export async function getCompoundsForGene(g: Gene): Promise<Compound[]> {
  return compounds.filter((c) => g.compoundIds.includes(c.id));
}
/** Resistance edges for a drug, joined with their mutation + gene. */
export async function getResistanceForCompound(
  compoundId: string,
): Promise<{ gene: Gene; mutation: Mutation; edge: ResistanceEdge }[]> {
  const out: { gene: Gene; mutation: Mutation; edge: ResistanceEdge }[] = [];
  for (const gene of genes)
    for (const mutation of gene.mutations)
      for (const edge of mutation.resistance)
        if (edge.drugId === compoundId) out.push({ gene, mutation, edge });
  return out;
}
export async function getGenesForCompound(c: Compound): Promise<Gene[]> {
  return genes.filter((g) => c.geneIds.includes(g.id));
}

/** Bounded first-degree neighbourhood for the graph explorer. */
export async function getNeighbors(
  type: "gene" | "compound" | "mutation" | "trial",
  id: string,
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const add = (n: GraphNode) => nodes.set(n.id, n);
  const edge = (s: string, t: string, label: string) => edges.push({ id: `${s}->${t}:${label}`, source: s, target: t, label });
  const geneNode = (g: Gene): GraphNode => ({ id: `gene:${g.id}`, type: "gene", label: g.name, href: `/gene/${g.id}`, meta: g.proteinName });
  const cmpNode = (c: Compound): GraphNode => ({
    id: `compound:${c.id}`, type: c.entityClass === "clinical_drug" ? "drug" : "compound",
    label: c.name, href: `/compound/${c.id}`, meta: c.tagline,
  });
  const mutNode = (m: Mutation): GraphNode => ({ id: `mutation:${m.id}`, type: "mutation", label: `${m.gene} ${m.display}`, href: `/gene/${m.gene}?mutation=${m.id}`, meta: m.original });
  const trialNode = (t: Trial): GraphNode => ({ id: `trial:${t.nctId}`, type: "trial", label: t.nctId, href: `/trial/${t.nctId}`, meta: t.title });

  if (type === "gene") {
    const g = await getGene(id);
    if (g) {
      add(geneNode(g));
      for (const m of g.mutations) {
        add(mutNode(m)); edge(`mutation:${m.id}`, `gene:${g.id}`, "is a change in");
        // Show the drugs up front, but attached to the mutation that links them (never straight to the gene).
        for (const r of m.resistance) {
          const d = compounds.find((c) => c.id === r.drugId);
          if (d) { add(cmpNode(d)); edge(`mutation:${m.id}`, `compound:${d.id}`, `resistance: ${expandClassification(r.classification)}`); }
        }
      }
      for (const c of compounds.filter((c) => g.compoundIds.includes(c.id))) {
        add(cmpNode(c)); edge(`gene:${g.id}`, `compound:${c.id}`, "lab-tested on");
      }
    }
  } else if (type === "mutation") {
    for (const g of genes) for (const m of g.mutations) if (m.id === id) {
      add(mutNode(m)); add(geneNode(g)); edge(`mutation:${m.id}`, `gene:${g.id}`, "is a change in");
      for (const r of m.resistance) {
        const c = compounds.find((c) => c.id === r.drugId)!;
        add(cmpNode(c)); edge(`mutation:${m.id}`, `compound:${c.id}`, `resistance: ${expandClassification(r.classification)}`);
      }
    }
  } else if (type === "compound") {
    const c = await getCompound(id);
    if (c) {
      add(cmpNode(c));
      for (const g of genes.filter((g) => g.compoundIds.includes(c.id))) {
        add(geneNode(g)); edge(`gene:${g.id}`, `compound:${c.id}`, "lab-tested on");
      }
      for (const r of await getResistanceForCompound(c.id)) {
        add(mutNode(r.mutation)); edge(`mutation:${r.mutation.id}`, `compound:${c.id}`, `resistance: ${expandClassification(r.edge.classification)}`);
      }
      for (const t of await getTrialsForCompound(c)) {
        add(trialNode(t)); edge(`compound:${c.id}`, `trial:${t.nctId}`, "tested in trial");
      }
    }
  } else if (type === "trial") {
    const t = await getTrial(id);
    if (t) {
      add(trialNode(t));
      for (const i of t.interventions) {
        const c = compounds.find((c) => c.id === i.compoundId);
        if (c) { add(cmpNode(c)); edge(`compound:${c.id}`, `trial:${t.nctId}`, "tested in trial"); }
      }
    }
  }
  return { nodes: [...nodes.values()], edges };
}

export async function getStats(type: GraphNode["type"], id: string) {
  if (type === "drug" || type === "compound") {
    const r = await getResistanceForCompound(id);
    const c = await getCompound(id);
    const n = (await getActivities({ compoundId: id })).length;
    const t = c?.trialIds.length ?? 0;
    return {
      stats: { "Linked resistance mutations": r.length, "Clinical trials": t, "Lab measurements": n },
      summary: c?.entityClass === "clinical_drug"
        ? `${c.name} is a drug used against tuberculosis. Mutations linked to bacteria resisting it, and the trials that tested it, connect to it here.`
        : `${c?.name} is an experimental compound (not an approved drug) with lab measurements against a target.`,
    };
  }
  if (type === "gene") {
    const g = await getGene(id);
    return {
      stats: { "Mutations listed by WHO": g?.mutations.length ?? 0, "Compounds lab-tested on it": g?.compoundIds.length ?? 0 },
      summary: `${g?.name} is a bacterial gene that makes the protein "${g?.proteinName}". Its mutations are shown around it; click one to see which drugs it is linked to.`,
    };
  }
  if (type === "mutation") {
    for (const g of genes) for (const m of g.mutations) if (`mutation:${m.id}` === id || m.id === id) {
      const ds = m.resistance.map((r) => `${compounds.find((c) => c.id === r.drugId)?.name} (${expandClassification(r.classification)})`).join("; ");
      return {
        stats: { "Position in protein": m.position ?? 0, "Drugs linked": m.resistance.length },
        summary: `${m.display} is a change at position ${m.position} of ${g.name}: ${m.refAa} is swapped for ${m.altAa}. WHO links it to: ${ds}.`,
      };
    }
  }
  if (type === "trial") {
    const t = await getTrial(id);
    return { stats: {}, summary: t ? `A clinical study in people: "${t.title}". Status: ${t.status}.` : "" };
  }
  return { stats: {}, summary: "" };
}

/** Compact list of everything in the portal, used by the navigation chatbot. */
export async function getCatalog() {
  return {
    genes: genes.map((g) => ({ name: g.name, protein: g.proteinName, href: `/gene/${g.id}`, mutations: g.mutations.length })),
    compounds: compounds.map((c) => ({
      name: c.name, kind: c.entityClass === "clinical_drug" ? "drug" : "compound", href: `/compound/${c.id}`, trials: c.trialIds.length,
    })),
    trials: trials.map((t) => ({ id: t.nctId, title: t.title, href: `/trial/${t.nctId}` })),
  };
}
