import Link from "next/link";
import Header from "@/components/Header";
import SearchBox from "@/components/SearchBox";

const EXAMPLES = [
  { label: "Rv0678", href: "/gene/Rv0678" },
  { label: "rpoB", href: "/gene/rpoB" },
  { label: "MmpL3", href: "/gene/MmpL3" },
  { label: "Bedaquiline", href: "/compound/bedaquiline" },
];


const PATHS = [
  { who: "Basic biology", q: "I study a TB gene or protein", hint: "See its 3D structure, the compounds tested on it, and the drugs it relates to.", href: "/gene/Rv0678", ex: "Try Rv0678" },
  { who: "Drug screening", q: "I'm looking at a drug or compound", hint: "See lab results, resistance links and the clinical trials that tested it.", href: "/compound/bedaquiline", ex: "Try bedaquiline" },
  { who: "Clinical and field work", q: "I want to see the trials", hint: "Start from a drug and follow it to the trials that tested it.", href: "/compound/bedaquiline#trials", ex: "Try bedaquiline trials" },
];

export default function Home() {
  return (
    <>
      <Header showSearch={false} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 pb-24 pt-16 text-center">
        <h1 className="text-5xl font-semibold tracking-tight">Mtb Explorer</h1>
        <p className="mt-3 text-muted">Explore the path from tuberculosis biology to drugs and clinical evidence.</p>
        <div className="mt-10 w-full text-left"><SearchBox large autoFocus /></div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {EXAMPLES.map((e) => (
            <Link key={e.label} href={e.href} className="rounded-full border border-line px-3.5 py-1.5 text-sm text-muted transition-colors hover:border-accent hover:text-accent">
              {e.label}
            </Link>
          ))}
        </div>
        <div className="mt-12 w-full text-left">
          <h2 className="text-sm font-medium">Not sure where to start? Pick what fits you</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {PATHS.map((p) => (
              <Link key={p.who} href={p.href} className="rounded-xl border border-line p-4 transition-colors hover:border-accent hover:bg-accent-soft/40">
                <div className="text-xs text-muted">{p.who}</div>
                <div className="mt-1 text-sm font-medium">{p.q}</div>
                <p className="mt-2 text-xs text-muted">{p.hint}</p>
                <div className="mt-3 text-xs text-accent">{p.ex} →</div>
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted">
          <span>Gene or target</span><span>→</span><span>Drug or compound</span><span>→</span><span>Clinical trial</span>
          <span className="basis-full" />
          <span>with resistance mutations and 3D structures along the way</span>
        </div>
      </main>
      <footer className="px-6 pb-6 text-center text-xs text-muted">
        Data from UniProt · ChEMBL · PubChem · PDB · AlphaFold DB · ClinicalTrials.gov · <Link href="/sources" className="underline">Licences and citations</Link>
      </footer>
    </>
  );
}
