import Header from "@/components/Header";
import { DATA_GENERATED_AT, IS_DEMO } from "@/lib/data";

type Src = { name: string; url: string; use: string; licence: string; cite: string; note?: string };
const SOURCES: Src[] = [
  { name: "UniProt", url: "https://www.uniprot.org", use: "Protein identity and annotation",
    licence: "CC BY 4.0", cite: "The UniProt Consortium, Nucleic Acids Research (see uniprot.org/help/publications for the current citation)." },
  { name: "ChEMBL", url: "https://www.ebi.ac.uk/chembl", use: "Compound pharmacology and activity",
    licence: "CC BY-SA 3.0 (attribution, and adapted data must stay under the same licence)",
    cite: "Zdrazil et al., Nucleic Acids Research (2024), the current ChEMBL paper; see the ChEMBL site for the exact reference.",
    note: "Access is also subject to the EMBL-EBI Terms of Use. Some calculated compound properties come from commercial software." },
  { name: "PubChem", url: "https://pubchem.ncbi.nlm.nih.gov", use: "Molecule identity and 3D conformers",
    licence: "NCBI policies apply, and each record may carry its own source licence",
    cite: "Kim et al., PubChem, Nucleic Acids Research (see the PubChem site for the current citation).",
    note: "See the NCBI Website and Data Usage Policies and Disclaimers at ncbi.nlm.nih.gov/home/about/policies. Some contributed records are non-commercial or restricted; check a record's source before reusing it." },
  { name: "RCSB Protein Data Bank (PDB)", url: "https://www.rcsb.org", use: "Experimental protein structures",
    licence: "CC0 1.0 (public domain dedication)",
    cite: "Cite the entry as doi:10.2210/pdb<ID>/pdb, plus Berman et al. (wwPDB) and RCSB.org; attributing the original structure authors is encouraged." },
  { name: "AlphaFold Protein Structure Database", url: "https://alphafold.ebi.ac.uk", use: "Predicted protein structures",
    licence: "CC BY 4.0",
    cite: "Jumper et al., Nature (2021); Varadi et al., Nucleic Acids Research (2024). EMBL-EBI also asks for Fleming et al., J. Mol. Biol. (2025); check the current citation page.",
    note: "Predictions are not experimental evidence and are not approved for clinical use. Structures are fetched from EMBL-EBI by your browser when you open a page." },
  { name: "ClinicalTrials.gov", url: "https://clinicaltrials.gov", use: "Human clinical studies",
    licence: "U.S. National Library of Medicine; use is subject to its Terms and Conditions (data may include third-party copyright)",
    cite: "Credit ClinicalTrials.gov as the source and show when the data was processed.",
    note: "Mtb Explorer reformats and shortens these records and matches interventions to compounds automatically. Always check the original record. Not endorsed by ClinicalTrials.gov or the NIH." },
  { name: "WHO TB mutation catalogue (2nd ed.)", url: "https://www.who.int/publications-detail-redirect/9789240082410", use: "Resistance-associated variants",
    licence: "CC BY-NC-SA 3.0 IGO (non-commercial; attribution to WHO required; adaptations must use the same or a similar licence)",
    cite: "Catalogue of mutations in Mycobacterium tuberculosis complex and their association with drug resistance, 2nd ed. Geneva: World Health Organization; 2023. Licence: CC BY-NC-SA 3.0 IGO.",
    note: "Not loaded in this portal yet. If added, it will carry WHO's required notice that the adaptation was not created by WHO and that WHO is not responsible for its content or accuracy." },
];

export default function Sources() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-14">
        <h1 className="text-3xl font-semibold tracking-tight">Sources and attribution</h1>
        <p className="mt-3 text-sm text-muted">
          This portal combines public databases. Every record links back to its source. Please cite the original database, not this portal, and follow its terms when you reuse data.
          {IS_DEMO ? " The data currently shown is placeholder content." : ` Database snapshot taken ${DATA_GENERATED_AT}.`}
        </p>
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {SOURCES.map((s) => (
            <li key={s.name} className="py-5 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <a href={s.url} target="_blank" rel="noreferrer" className="text-base font-medium text-accent hover:underline">{s.name}</a>
                <span className="text-muted">{s.use}</span>
              </div>
              <p className="mt-2"><span className="text-muted">Licence: </span>{s.licence}</p>
              <p className="mt-1"><span className="text-muted">Cite: </span>{s.cite}</p>
              {s.note && <p className="mt-1 text-muted">{s.note}</p>}
            </li>
          ))}
        </ul>
        <p className="mt-8 text-xs text-muted">
          3D structures are drawn with 3Dmol.js (BSD-3-Clause). Licence and citation details here come from each source&apos;s published terms and may change; the original source is always authoritative.
          Mtb Explorer is a research prototype, not medical advice, and is not endorsed by any of the organisations above.
        </p>
      </main>
    </>
  );
}
