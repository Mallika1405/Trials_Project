// DEMO DATA ONLY. Every value below is an illustrative placeholder, not a scientific
// claim. Identifiers marked DEMO are intentionally invalid. Replace by implementing
// the same functions in ./index.ts against the real normalized database.
import type { Activity, Compound, Gene, Trial } from "../types";

const WHO = (row: string) => ({
  source: "WHO TB Mutation Catalogue",
  version: "2nd edition (demo)",
  externalId: row,
  url: null,
  note: "Placeholder row — not real catalogue data.",
});
const CHEMBL = (doc: string) => ({
  source: "ChEMBL",
  version: "demo",
  externalId: doc,
  url: null,
  note: "Placeholder record — not real ChEMBL data.",
});

export const genes: Gene[] = [
  {
    id: "Rv0678",
    name: "Rv0678",
    locusTag: "Rv0678",
    aliases: ["MmpR5", "Rv0678c-demo"],
    proteinName: "Transcriptional regulator",
    uniprot: "DEMO-P0001",
    organism: "Mycobacterium tuberculosis H37Rv",
    function:
      "Demo text: repressor of an efflux-pump operon. Real function text will come from UniProt.",
    length: 165,
    structure: { kind: "experimental", source: "PDB", id: "DEMO-1ABC", method: "X-ray diffraction", resolution: "2.1 Å", length: 165 },
    mutations: [
      {
        id: "m-rv0678-r94w", gene: "Rv0678", display: "R94W", original: "p.Arg94Trp",
        refAa: "R", position: 94, altAa: "W",
        resistance: [
          { mutationId: "m-rv0678-r94w", drugId: "bedaquiline", classification: "Uncertain significance", provenance: WHO("demo-row-101") },
          { mutationId: "m-rv0678-r94w", drugId: "clofazimine", classification: "Uncertain significance", provenance: WHO("demo-row-102") },
        ],
      },
      {
        id: "m-rv0678-l117r", gene: "Rv0678", display: "L117R", original: "p.Leu117Arg",
        refAa: "L", position: 117, altAa: "R",
        resistance: [
          { mutationId: "m-rv0678-l117r", drugId: "bedaquiline", classification: "Assoc w R", provenance: WHO("demo-row-103") },
          { mutationId: "m-rv0678-l117r", drugId: "clofazimine", classification: "Assoc w R - Interim", provenance: WHO("demo-row-104") },
        ],
      },
      {
        id: "m-rv0678-a36v", gene: "Rv0678", display: "A36V", original: "p.Ala36Val",
        refAa: "A", position: 36, altAa: "V",
        resistance: [{ mutationId: "m-rv0678-a36v", drugId: "bedaquiline", classification: "Assoc w R - Interim", provenance: WHO("demo-row-105") }],
      },
    ],
    compoundIds: [],
  },
  {
    id: "rpoB",
    name: "rpoB",
    locusTag: "Rv0667",
    aliases: ["Rif", "mycA-demo"],
    proteinName: "DNA-directed RNA polymerase subunit beta",
    uniprot: "DEMO-P0002",
    organism: "Mycobacterium tuberculosis H37Rv",
    function: "Demo text: catalytic subunit of RNA polymerase. Real text will come from UniProt.",
    length: 1178,
    structure: { kind: "predicted", source: "AlphaFold DB", id: "AF-DEMO-F1", length: 220 },
    mutations: [
      {
        id: "m-rpob-s450l", gene: "rpoB", display: "S450L", original: "p.Ser450Leu",
        refAa: "S", position: 450, altAa: "L",
        resistance: [{ mutationId: "m-rpob-s450l", drugId: "rifampicin", classification: "Assoc w R", provenance: WHO("demo-row-201") }],
      },
      {
        id: "m-rpob-h445y", gene: "rpoB", display: "H445Y", original: "p.His445Tyr",
        refAa: "H", position: 445, altAa: "Y",
        resistance: [{ mutationId: "m-rpob-h445y", drugId: "rifampicin", classification: "Assoc w R", provenance: WHO("demo-row-202") }],
      },
    ],
    compoundIds: [],
  },
  {
    id: "katG",
    name: "katG",
    locusTag: "Rv1908c",
    aliases: ["catalase-peroxidase"],
    proteinName: "Catalase-peroxidase",
    uniprot: "DEMO-P0003",
    organism: "Mycobacterium tuberculosis H37Rv",
    function: "Demo text: activates a prodrug. Real text will come from UniProt.",
    length: 740,
    structure: { kind: "experimental", source: "PDB", id: "DEMO-2XYZ", method: "X-ray diffraction", resolution: "2.4 Å", length: 190 },
    mutations: [
      {
        id: "m-katg-s315t", gene: "katG", display: "S315T", original: "p.Ser315Thr",
        refAa: "S", position: 315, altAa: "T",
        resistance: [{ mutationId: "m-katg-s315t", drugId: "isoniazid", classification: "Assoc w R", provenance: WHO("demo-row-301") }],
      },
    ],
    compoundIds: [],
  },
  {
    id: "MmpL3",
    name: "mmpL3",
    locusTag: "Rv0206c",
    aliases: ["MmpL3", "Rv0206"],
    proteinName: "Trehalose monomycolate transporter MmpL3",
    uniprot: "DEMO-P0004",
    organism: "Mycobacterium tuberculosis H37Rv",
    function: "Demo text: membrane transporter, an investigated drug target. Real text will come from UniProt.",
    length: 944,
    structure: { kind: "predicted", source: "AlphaFold DB", id: "AF-DEMO-F4", length: 240 },
    mutations: [],
    compoundIds: ["demo-cpd-1", "demo-cpd-2", "demo-cpd-3"],
  },
];

export const compounds: Compound[] = [
  {
    id: "bedaquiline", name: "Bedaquiline", entityClass: "clinical_drug", tagline: "Anti-tuberculosis drug",
    chemblId: "CHEMBL-DEMO-1", pubchemCid: "DEMO-CID-1",
    synonyms: ["Sirturo", "TMC207", "R207910"],
    formula: "C32H31BrN2O2", molecularWeight: "555.5 g/mol",
    smiles: "DEMO-SMILES-bedaquiline", inchikey: "DEMO-INCHIKEY-BEDAQ-UILIN",
    geneIds: ["Rv0678"], trialIds: ["NCT-DEMO-0001", "NCT-DEMO-0002"],
  },
  {
    id: "clofazimine", name: "Clofazimine", entityClass: "clinical_drug", tagline: "Anti-tuberculosis drug",
    chemblId: "CHEMBL-DEMO-2", pubchemCid: "DEMO-CID-2",
    synonyms: ["Lamprene", "B663"],
    formula: "C27H22Cl2N4", molecularWeight: "473.4 g/mol",
    smiles: "DEMO-SMILES-clofazimine", inchikey: "DEMO-INCHIKEY-CLOFA-ZIMIN",
    geneIds: ["Rv0678"], trialIds: ["NCT-DEMO-0002"],
  },
  {
    id: "rifampicin", name: "Rifampicin", entityClass: "clinical_drug", tagline: "Anti-tuberculosis drug",
    chemblId: "CHEMBL-DEMO-3", pubchemCid: "DEMO-CID-3",
    synonyms: ["Rifampin", "RIF", "Rifadin"],
    formula: "C43H58N4O12", molecularWeight: "822.9 g/mol",
    smiles: "DEMO-SMILES-rifampicin", inchikey: "DEMO-INCHIKEY-RIFAM-PICIN",
    geneIds: ["rpoB"], trialIds: ["NCT-DEMO-0003"],
  },
  {
    id: "isoniazid", name: "Isoniazid", entityClass: "clinical_drug", tagline: "Anti-tuberculosis drug",
    chemblId: "CHEMBL-DEMO-4", pubchemCid: "DEMO-CID-4",
    synonyms: ["INH", "Isonicotinic acid hydrazide"],
    formula: "C6H7N3O", molecularWeight: "137.1 g/mol",
    smiles: "DEMO-SMILES-isoniazid", inchikey: "DEMO-INCHIKEY-ISONI-AZID",
    geneIds: ["katG"], trialIds: ["NCT-DEMO-0003"],
  },
  ...[1, 2, 3].map((n): Compound => ({
    id: `demo-cpd-${n}`, name: `DEMO-COMPOUND-${n}`, entityClass: "experimental_compound",
    tagline: "Experimental compound — not a drug",
    chemblId: `CHEMBL-DEMO-X${n}`, pubchemCid: `DEMO-CID-X${n}`,
    synonyms: [], formula: "C20H24N2O", molecularWeight: "308.4 g/mol",
    smiles: `DEMO-SMILES-x${n}`, inchikey: `DEMO-INCHIKEY-X${n}`,
    geneIds: ["MmpL3"], trialIds: [],
  })),
];

export const activities: Activity[] = [
  { id: "a1", compoundId: "bedaquiline", target: "M. tuberculosis H37Rv", type: "MIC", value: 0.06, units: "µM", assay: "CHEMBL-DEMO-ASSAY-1", provenance: CHEMBL("DEMO-DOC-1") },
  { id: "a2", compoundId: "bedaquiline", target: "M. tuberculosis H37Rv", type: "MIC90", value: 0.12, units: "µM", assay: "CHEMBL-DEMO-ASSAY-2", provenance: CHEMBL("DEMO-DOC-2") },
  { id: "a3", compoundId: "bedaquiline", target: "ATP synthase c subunit (demo)", type: "IC50", value: 0.01, units: "µM", assay: "CHEMBL-DEMO-ASSAY-3", provenance: CHEMBL("DEMO-DOC-3") },
  { id: "a4", compoundId: "clofazimine", target: "M. tuberculosis H37Rv", type: "MIC", value: 0.5, units: "µM", assay: "CHEMBL-DEMO-ASSAY-4", provenance: CHEMBL("DEMO-DOC-4") },
  { id: "a5", compoundId: "rifampicin", target: "M. tuberculosis H37Rv", type: "MIC", value: 0.1, units: "µM", assay: "CHEMBL-DEMO-ASSAY-5", provenance: CHEMBL("DEMO-DOC-5") },
  { id: "a6", compoundId: "isoniazid", target: "M. tuberculosis H37Rv", type: "MIC", value: 0.4, units: "µM", assay: "CHEMBL-DEMO-ASSAY-6", provenance: CHEMBL("DEMO-DOC-6") },
  { id: "a7", compoundId: "demo-cpd-1", geneId: "MmpL3", target: "MmpL3", type: "MIC", value: 0.42, units: "µM", assay: "CHEMBL-DEMO-ASSAY-7", provenance: CHEMBL("DEMO-DOC-7") },
  { id: "a8", compoundId: "demo-cpd-1", geneId: "MmpL3", target: "MmpL3", type: "IC50", value: 1.3, units: "µM", assay: "CHEMBL-DEMO-ASSAY-8", provenance: CHEMBL("DEMO-DOC-8") },
  { id: "a9", compoundId: "demo-cpd-2", geneId: "MmpL3", target: "MmpL3", type: "MIC", value: 0.9, units: "µM", assay: "CHEMBL-DEMO-ASSAY-9", provenance: CHEMBL("DEMO-DOC-9") },
  { id: "a10", compoundId: "demo-cpd-3", geneId: "MmpL3", target: "MmpL3", type: "Ki", value: 0.25, units: "µM", assay: "CHEMBL-DEMO-ASSAY-10", provenance: CHEMBL("DEMO-DOC-10") },
];

export const trials: Trial[] = [
  {
    nctId: "NCT-DEMO-0001", title: "Demo trial: treatment of drug-resistant pulmonary tuberculosis",
    phase: "PHASE III", status: "Completed", enrollment: 842, sponsor: "Demo Research Institute",
    studyType: "Interventional", start: "2018-03", end: "2022-11", conditions: ["Pulmonary tuberculosis (demo)"],
    interventions: [{ name: "Bedaquiline", compoundId: "bedaquiline", matchConfidence: 1 }],
    locations: ["Demo City, Demoland"], summary: "Placeholder summary text. Real summaries come from ClinicalTrials.gov.",
    resultsAvailable: true,
  },
  {
    nctId: "NCT-DEMO-0002", title: "Demo trial: shortened regimen including bedaquiline and clofazimine",
    phase: "PHASE II", status: "Recruiting", enrollment: 300, sponsor: "Demo Health Consortium",
    studyType: "Interventional", start: "2023-06", end: "2026-12", conditions: ["Drug-resistant tuberculosis (demo)"],
    interventions: [
      { name: "Bedaquiline", compoundId: "bedaquiline", matchConfidence: 1 },
      { name: "Clofazimine", compoundId: "clofazimine", matchConfidence: 1 },
    ],
    locations: ["Demo City, Demoland", "Sample Town, Testland"], summary: "Placeholder summary text.",
    resultsAvailable: false,
  },
  {
    nctId: "NCT-DEMO-0003", title: "Demo trial: four-month rifampicin- and isoniazid-containing regimen",
    phase: "PHASE III", status: "Active, not recruiting", enrollment: 1200, sponsor: "Demo Research Institute",
    studyType: "Interventional", start: "2020-01", end: "2025-05", conditions: ["Tuberculosis (demo)"],
    interventions: [
      { name: "Rifampicin", compoundId: "rifampicin", matchConfidence: 1 },
      { name: "Isoniazid", compoundId: "isoniazid", matchConfidence: 1 },
    ],
    locations: ["Sample Town, Testland"], summary: "Placeholder summary text.", resultsAvailable: false,
  },
];
