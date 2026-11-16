import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import { Meta, StatusPill } from "@/components/ui";
import { DATA_GENERATED_AT, IS_DEMO, getTrial } from "@/lib/data";
import { parseVia } from "@/lib/format";

export default async function TrialPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ via?: string }> }) {
  const { id } = await params;
  const { via } = await searchParams;
  const trial = await getTrial(decodeURIComponent(id));
  if (!trial) notFound();
  let path = parseVia(via);
  if (path.length === 0) path = trial.interventions.map((i) => i.name).slice(0, 1);
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <div className="rounded-xl border border-line bg-accent-soft/50 px-5 py-4 text-sm">
          <div className="text-xs text-muted">Why you&apos;re seeing this</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {path.map((p, i) => (
              <span key={i} className="flex items-center gap-2">
                <span>{p}</span><span className="text-muted">→</span>
              </span>
            ))}
            <span className="font-medium text-accent">this trial</span>
          </div>
        </div>

        <p className="mt-10 text-sm text-muted">{trial.nctId}</p>
        <h1 className="mt-1 text-4xl font-semibold leading-tight tracking-tight">{trial.title}</h1>
        <div className="mt-4 flex items-center gap-3 text-sm text-muted"><StatusPill status={trial.status} /> {trial.phase}</div>

        <div className="mt-10">
          <Meta k="Interventions">
            {trial.interventions.map((i, n) => (
              <span key={n}>{n > 0 && ", "}
                {i.compoundId ? <Link href={`/compound/${i.compoundId}`} className="text-accent hover:underline">{i.name}</Link> : i.name}
              </span>
            ))}
          </Meta>
          <Meta k="Enrollment">{trial.enrollment} participants</Meta>
          <Meta k="Sponsor">{trial.sponsor}</Meta>
          <Meta k="Study type">{trial.studyType}</Meta>
          <Meta k="Conditions">{trial.conditions.join(", ")}</Meta>
          <Meta k="Start date">{trial.start}</Meta>
          <Meta k="Completion date">{trial.end}</Meta>
          <Meta k="Locations">{trial.locations.join(" · ")}</Meta>
          <Meta k="Results">{trial.resultsAvailable ? "Results available" : "No results posted"}</Meta>
          <Meta k="Brief summary">{trial.summary}</Meta>
        </div>
        <p className="mt-8 text-xs text-muted">
          {IS_DEMO
            ? "Placeholder demo record; no external record exists for this demo ID."
            : <>Source: <a className="underline" target="_blank" rel="noreferrer" href={`https://clinicaltrials.gov/study/${trial.nctId}`}>ClinicalTrials.gov record {trial.nctId}</a>, a database of the U.S. National Library of Medicine.
              Data retrieved {DATA_GENERATED_AT}. Mtb Explorer reformats and shortens these records (for example, it matches interventions to compounds automatically), so check the original record. The full study may also be under third-party copyright. Not endorsed by ClinicalTrials.gov or the NIH. See <Link className="underline" href="/sources">Sources</Link>.</>}
        </p>
      </main>
    </>
  );
}
