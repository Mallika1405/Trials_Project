import { notFound } from "next/navigation";
import Header from "@/components/Header";
import CompoundView from "@/components/CompoundView";
import { getActivities, getCompound, getGenesForCompound, getResistanceForCompound, getTrialsForCompound } from "@/lib/data";
import { parseVia } from "@/lib/format";

export default async function CompoundPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ via?: string }> }) {
  const { id } = await params;
  const { via } = await searchParams;
  const compound = await getCompound(decodeURIComponent(id));
  if (!compound) notFound();
  const [activities, resistance, trials, genes] = await Promise.all([
    getActivities({ compoundId: compound.id }), getResistanceForCompound(compound.id), getTrialsForCompound(compound), getGenesForCompound(compound),
  ]);
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6">
        <CompoundView compound={compound} activities={activities} resistance={resistance} trials={trials} genes={genes} via={parseVia(via)} />
      </main>
    </>
  );
}
