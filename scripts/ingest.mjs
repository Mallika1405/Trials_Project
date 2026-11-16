// Pulls real data from public, open APIs and writes src/lib/data/live.json in the
// shape of src/lib/types.ts. Run: npm run ingest
//
// Sources (all free, no key): UniProt, ChEMBL, PubChem, RCSB PDB, AlphaFold DB,
// ClinicalTrials.gov. The WHO mutation catalogue is deliberately NOT ingested, so
// genes carry no mutations / resistance edges in live mode.
import { writeFile } from "node:fs/promises";

const OUT = new URL("../src/lib/data/live.json", import.meta.url);
const UA = "mtb-explorer-ingest/0.1 (research prototype)";
const MTB_TAXON = 83332; // M. tuberculosis H37Rv
const CHEMBL_UI = "https://www.ebi.ac.uk/chembl/explore";

// ---- Seed lists: what to look up. Everything else is fetched. -------------------
const GENES = ["Rv0678", "Rv0667", "Rv1908c", "Rv0206c", "Rv1484", "Rv1305"]; // locus tags
const DRUGS = [
  "bedaquiline", "clofazimine", "rifampin", "isoniazid", "pretomanid",
  "delamanid", "linezolid", "ethambutol", "pyrazinamide",
];
const EXPERIMENTAL_PER_GENE = 6; // cap on experimental compounds pulled per target

// ---- HTTP helpers ---------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function getJson(url, { optional = false } = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await sleep(350); // be polite: ~3 req/s max, within PubChem's stated limits
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (res.status === 404 && optional) return null;
      if (res.ok) return await res.json();
      if (res.status === 429 || res.status >= 500) { await sleep(1500 * (attempt + 1)); continue; }
      if (optional) return null;
      throw new Error(`${res.status} ${url}`);
    } catch (e) {
      if (attempt === 2) { if (optional) return null; throw e; }
      await sleep(1000);
    }
  }
  return null;
}
const log = (...a) => console.log(...a);
const enc = encodeURIComponent;
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");

// ---- UniProt + PDB + AlphaFold -> Gene --------------------------------------------
async function buildGene(locus) {
  const q = `(gene:${locus}) AND (organism_id:${MTB_TAXON}) AND (reviewed:true)`;
  const j = await getJson(`https://rest.uniprot.org/uniprotkb/search?query=${enc(q)}&format=json&size=1`);
  const r = j?.results?.[0];
  if (!r) { log(`  ! UniProt: no reviewed entry for ${locus}`); return null; }
  const acc = r.primaryAccession;
  const g0 = r.genes?.[0] ?? {};
  const name = g0.geneName?.value ?? locus;
  const aliases = [
    ...(g0.synonyms ?? []).map((s) => s.value),
    ...(g0.orfNames ?? []).map((s) => s.value),
  ].filter((a) => a !== name);
  const fn = (r.comments ?? []).find((c) => c.commentType === "FUNCTION")?.texts?.[0]?.value ?? "";
  const proteinName =
    r.proteinDescription?.recommendedName?.fullName?.value ??
    r.proteinDescription?.submissionNames?.[0]?.fullName?.value ?? name;
  const length = r.sequence?.length ?? 0;

  // Structure: prefer the best-resolution experimental PDB entry, else AlphaFold.
  let structure = { kind: "none", source: "none", length };
  const pdbRefs = (r.uniProtKBCrossReferences ?? []).filter((x) => x.database === "PDB");
  const resOf = (x) => parseFloat(x.properties?.find((p) => p.key === "Resolution")?.value) || 99;
  const best = [...pdbRefs].sort((a, b) => resOf(a) - resOf(b))[0];
  if (best) {
    const e = await getJson(`https://data.rcsb.org/rest/v1/core/entry/${best.id}`, { optional: true });
    const method = e?.exptl?.[0]?.method ?? best.properties?.find((p) => p.key === "Method")?.value;
    const res = e?.rcsb_entry_info?.resolution_combined?.[0];
    structure = {
      kind: "experimental", source: "PDB", id: best.id, method,
      resolution: res ? `${res} Å` : best.properties?.find((p) => p.key === "Resolution")?.value, length,
    };
  } else {
    const af = await getJson(`https://alphafold.ebi.ac.uk/api/prediction/${acc}`, { optional: true });
    if (af?.[0]?.entryId) structure = { kind: "predicted", source: "AlphaFold DB", id: af[0].entryId, length };
  }

  return {
    id: name, name, locusTag: locus, aliases, proteinName, uniprot: acc,
    organism: r.organism?.scientificName ?? "Mycobacterium tuberculosis",
    function: fn, length, structure,
    mutations: [], // WHO catalogue intentionally not ingested
    compoundIds: [],
  };
}

// ---- ChEMBL + PubChem -> Compound --------------------------------------------------
const chemblProv = (id, type, version) => ({
  source: "ChEMBL", version, externalId: id, url: `${CHEMBL_UI}/${type}/${id}`,
});

async function pubchemCid(name, inchikey) {
  const byKey = inchikey && await getJson(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/${inchikey}/cids/JSON`, { optional: true });
  const cid = byKey?.IdentifierList?.CID?.[0];
  if (cid) return String(cid);
  const byName = name && await getJson(`https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${enc(name)}/cids/JSON`, { optional: true });
  return byName?.IdentifierList?.CID?.[0] ? String(byName.IdentifierList.CID[0]) : "";
}

function toCompound(m, cid) {
  const props = m.molecule_properties ?? {};
  const syn = [...new Set((m.molecule_synonyms ?? []).map((s) => s.molecule_synonym))]
    .filter((s) => s && norm(s) !== norm(m.pref_name ?? ""));
  const isDrug = Number(m.max_phase) === 4;
  const name = m.pref_name ? m.pref_name[0] + m.pref_name.slice(1).toLowerCase() : m.molecule_chembl_id;
  return {
    id: isDrug ? norm(m.pref_name) : m.molecule_chembl_id.toLowerCase(),
    name,
    entityClass: isDrug ? "clinical_drug" : "experimental_compound",
    tagline: isDrug ? "Approved drug (ChEMBL max phase 4)" : "Experimental compound — not an approved drug",
    chemblId: m.molecule_chembl_id, pubchemCid: cid,
    synonyms: syn.slice(0, 12),
    formula: props.full_molformula ?? "",
    molecularWeight: props.full_mwt ? `${props.full_mwt} g/mol` : "",
    smiles: m.molecule_structures?.canonical_smiles ?? "",
    inchikey: m.molecule_structures?.standard_inchi_key ?? "",
    geneIds: [], trialIds: [],
  };
}

async function chemblMoleculeByName(name) {
  const j = await getJson(`https://www.ebi.ac.uk/chembl/api/data/molecule.json?pref_name__iexact=${enc(name)}&limit=1`);
  return j?.molecules?.[0] ?? null;
}
async function chemblMoleculeById(id) {
  return getJson(`https://www.ebi.ac.uk/chembl/api/data/molecule/${id}.json`, { optional: true });
}

// ---- ChEMBL activities ---------------------------------------------------------------
const TYPES = ["MIC", "MIC90", "IC50", "EC50", "Ki"];
function toActivity(a, compoundId, geneId, version) {
  return {
    id: `chembl-act-${a.activity_id}`, compoundId, ...(geneId ? { geneId } : {}),
    target: a.target_pref_name ?? "unknown target",
    type: a.standard_type, value: Number(a.standard_value), units: a.standard_units ?? "",
    assay: a.assay_chembl_id,
    provenance: {
      ...chemblProv(a.document_chembl_id ?? a.assay_chembl_id, a.document_chembl_id ? "document" : "assay", version),
      note: `Assay ${a.assay_chembl_id}: ${a.assay_description ?? ""}`.slice(0, 300),
    },
  };
}
async function chemblActivities(params) {
  const base = `https://www.ebi.ac.uk/chembl/api/data/activity.json?standard_type__in=${TYPES.join(",")}` +
    `&standard_value__isnull=false&standard_relation==&standard_units=nM&order_by=standard_value&limit=100&${params}`;
  const j = await getJson(base, { optional: true });
  return (j?.activities ?? []).filter((a) => a.standard_value != null && TYPES.includes(a.standard_type));
}

// ---- ClinicalTrials.gov -> Trial -----------------------------------------------------
const STATUS = {
  RECRUITING: "Recruiting", COMPLETED: "Completed", TERMINATED: "Terminated",
  ACTIVE_NOT_RECRUITING: "Active, not recruiting", NOT_YET_RECRUITING: "Not yet recruiting",
  ENROLLING_BY_INVITATION: "Enrolling by invitation", WITHDRAWN: "Withdrawn", SUSPENDED: "Suspended",
};
function toTrial(s) {
  const p = s.protocolSection ?? {};
  const id = p.identificationModule ?? {};
  return {
    nctId: id.nctId, title: id.briefTitle ?? id.officialTitle ?? id.nctId,
    phase: (p.designModule?.phases ?? []).join(" / ").replace(/_/g, " ") || "N/A",
    status: STATUS[p.statusModule?.overallStatus] ?? (p.statusModule?.overallStatus ?? "Unknown"),
    enrollment: p.designModule?.enrollmentInfo?.count ?? 0,
    sponsor: p.sponsorCollaboratorsModule?.leadSponsor?.name ?? "",
    studyType: p.designModule?.studyType ?? "",
    start: p.statusModule?.startDateStruct?.date ?? "", end: p.statusModule?.completionDateStruct?.date ?? "",
    conditions: p.conditionsModule?.conditions ?? [],
    interventions: (p.armsInterventionsModule?.interventions ?? []).map((i) => ({ name: i.name })),
    locations: [...new Set((p.contactsLocationsModule?.locations ?? []).map((l) => [l.city, l.country].filter(Boolean).join(", ")))].slice(0, 10),
    summary: p.descriptionModule?.briefSummary ?? "",
    resultsAvailable: !!s.hasResults,
  };
}

// ---- Main ----------------------------------------------------------------------------
async function main() {
  const status = await getJson("https://www.ebi.ac.uk/chembl/api/data/status.json", { optional: true });
  const chemblVersion = status?.chembl_db_version ?? "unknown";
  const today = new Date().toISOString().slice(0, 10);
  log(`ChEMBL ${chemblVersion}; ingest date ${today}`);

  const genes = [];
  const compounds = new Map(); // id -> Compound
  const activities = new Map(); // id -> Activity

  const addCompound = async (m) => {
    const c = toCompound(m, "");
    if (compounds.has(c.id)) return compounds.get(c.id);
    c.pubchemCid = await pubchemCid(m.pref_name, c.inchikey);
    compounds.set(c.id, c);
    return c;
  };

  log("Genes (UniProt / PDB / AlphaFold)");
  for (const locus of GENES) {
    const g = await buildGene(locus);
    if (g) { genes.push(g); log(`  ✓ ${g.name} ${g.uniprot} structure=${g.structure.kind}:${g.structure.id ?? "-"}`); }
  }

  log("Drugs (ChEMBL / PubChem)");
  for (const name of DRUGS) {
    const m = await chemblMoleculeByName(name);
    if (!m) { log(`  ! ChEMBL: ${name} not found`); continue; }
    const c = await addCompound(m);
    // Whole-organism / target potency for the drug itself.
    for (const a of (await chemblActivities(`molecule_chembl_id=${m.molecule_chembl_id}`)).slice(0, 6)) {
      activities.set(`chembl-act-${a.activity_id}`, toActivity(a, c.id, undefined, chemblVersion));
    }
    log(`  ✓ ${c.name} ${c.chemblId} CID ${c.pubchemCid || "-"}`);
  }

  log("Target activities (ChEMBL)");
  for (const g of genes) {
    const t = await getJson(`https://www.ebi.ac.uk/chembl/api/data/target.json?target_components__accession=${g.uniprot}&limit=1`, { optional: true });
    const tid = t?.targets?.[0]?.target_chembl_id;
    if (!tid) { log(`  - ${g.name}: no ChEMBL single-protein target`); continue; }
    const acts = await chemblActivities(`target_chembl_id=${tid}`);
    const byMol = new Map();
    for (const a of acts) if (!byMol.has(a.molecule_chembl_id)) byMol.set(a.molecule_chembl_id, []);
    for (const a of acts) byMol.get(a.molecule_chembl_id).push(a);
    let n = 0;
    for (const [molId, list] of byMol) {
      const known = [...compounds.values()].find((c) => c.chemblId === molId);
      let c = known;
      if (!c) {
        if (n >= EXPERIMENTAL_PER_GENE) continue;
        const m = await chemblMoleculeById(molId);
        if (!m) continue;
        c = await addCompound(m);
        n++;
      }
      if (!g.compoundIds.includes(c.id)) g.compoundIds.push(c.id);
      if (!c.geneIds.includes(g.id)) c.geneIds.push(g.id);
      for (const a of list.slice(0, 3)) activities.set(`chembl-act-${a.activity_id}`, toActivity(a, c.id, g.id, chemblVersion));
    }
    log(`  ✓ ${g.name} (${tid}): ${g.compoundIds.length} compounds, +${n} experimental`);
  }

  log("Trials (ClinicalTrials.gov)");
  const trials = new Map();
  const byName = new Map();
  for (const c of compounds.values()) for (const n of [c.name, ...c.synonyms]) byName.set(norm(n), c);
  for (const c of [...compounds.values()].filter((c) => c.entityClass === "clinical_drug")) {
    const url = `https://clinicaltrials.gov/api/v2/studies?query.intr=${enc(c.name)}&query.cond=${enc("tuberculosis")}&pageSize=10`;
    const j = await getJson(url, { optional: true });
    for (const s of j?.studies ?? []) {
      const t = toTrial(s);
      if (!t.nctId) continue;
      // Only exact name / synonym matches are linked; anything else stays unlinked.
      t.interventions = t.interventions.map((i) => {
        const hit = byName.get(norm(i.name));
        return hit ? { name: i.name, compoundId: hit.id, matchConfidence: 1 } : { name: i.name };
      });
      trials.set(t.nctId, t);
    }
    log(`  ✓ ${c.name}: ${j?.studies?.length ?? 0} studies`);
  }
  for (const t of trials.values())
    for (const i of t.interventions)
      if (i.compoundId) {
        const c = compounds.get(i.compoundId);
        if (c && !c.trialIds.includes(t.nctId)) c.trialIds.push(t.nctId);
      }

  const out = {
    generatedAt: today,
    sources: {
      UniProt: "rest.uniprot.org", ChEMBL: chemblVersion, PubChem: "pubchem.ncbi.nlm.nih.gov",
      PDB: "data.rcsb.org", "AlphaFold DB": "alphafold.ebi.ac.uk", "ClinicalTrials.gov": "clinicaltrials.gov API v2",
    },
    genes, compounds: [...compounds.values()], activities: [...activities.values()], trials: [...trials.values()],
  };
  await writeFile(OUT, JSON.stringify(out, null, 1) + "\n");
  log(`\nWrote live.json: ${genes.length} genes, ${out.compounds.length} compounds, ${out.activities.length} activities, ${out.trials.length} trials`);
}

main().catch((e) => { console.error(e); process.exit(1); });
