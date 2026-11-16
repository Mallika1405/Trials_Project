// Internal, source-agnostic schema. UI reads only these types.

export type EntityType = "gene" | "protein" | "compound" | "drug" | "mutation" | "trial";

/** Every relationship / measurement carries where it came from. */
export interface Provenance {
  source: string; // e.g. "WHO TB Mutation Catalogue"
  version?: string; // e.g. "2nd edition"
  externalId?: string;
  url?: string | null;
  note?: string;
}

export interface StructureInfo {
  kind: "experimental" | "predicted" | "none";
  source: string; // "PDB" | "AlphaFold DB"
  id?: string;
  method?: string;
  resolution?: string;
  length: number; // residues, used by the placeholder viewer
}

export interface Mutation {
  id: string;
  gene: string;
  display: string; // normalized, e.g. R94W
  original: string; // source notation, never discarded
  refAa: string;
  position: number | null;
  altAa: string;
  resistance: ResistanceEdge[];
}

export interface ResistanceEdge {
  mutationId: string;
  drugId: string;
  classification: string; // verbatim source terminology
  provenance: Provenance;
}

export interface Gene {
  id: string;
  name: string;
  locusTag: string;
  aliases: string[];
  proteinName: string;
  uniprot: string;
  organism: string;
  function: string;
  length: number;
  structure: StructureInfo;
  mutations: Mutation[];
  compoundIds: string[]; // compounds with activity against this target
}

export interface Activity {
  id: string;
  compoundId: string;
  geneId?: string;
  target: string;
  type: "MIC" | "MIC90" | "IC50" | "EC50" | "Ki";
  value: number;
  units: string;
  assay: string;
  provenance: Provenance;
}

export interface Compound {
  id: string;
  name: string;
  entityClass: "experimental_compound" | "clinical_drug" | "unknown";
  tagline: string;
  chemblId: string;
  pubchemCid: string;
  synonyms: string[];
  formula: string;
  molecularWeight: string;
  smiles: string;
  inchikey: string;
  geneIds: string[];
  trialIds: string[];
}

export interface Trial {
  nctId: string;
  title: string;
  phase: string;
  status: string; // ClinicalTrials.gov overall status, humanised
  enrollment: number;
  sponsor: string;
  studyType: string;
  start: string;
  end: string;
  conditions: string[];
  interventions: { name: string; compoundId?: string; matchConfidence?: number }[];
  locations: string[];
  summary: string;
  resultsAvailable: boolean;
}

export interface SearchHit {
  type: EntityType;
  id: string;
  title: string;
  subtitle: string;
  hint?: string;
  href: string;
}

export interface GraphNode {
  id: string;
  type: EntityType;
  label: string;
  href: string;
  meta?: string;
}
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface Evidence {
  relationship: string;
  rows: { label: string; value: string }[];
  provenance: Provenance;
}
