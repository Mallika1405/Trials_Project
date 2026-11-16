import { notFound } from "next/navigation";
import Header from "@/components/Header";
import GeneView from "@/components/GeneView";
import { compounds as allCompounds } from "@/lib/data/demo";
import { getActivities, getCompoundsForGene, getGene } from "@/lib/data";

export default async function GenePage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ mutation?: string }> }) {
  const { id } = await params;
  const { mutation } = await searchParams;
  const gene = await getGene(decodeURIComponent(id));
  if (!gene) notFound();
  const [compounds, activities] = await Promise.all([getCompoundsForGene(gene), getActivities({ geneId: gene.id })]);
  const drugNames = Object.fromEntries(allCompounds.map((c) => [c.id, c.name]));
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6">
        <GeneView gene={gene} compounds={compounds} activities={activities} drugNames={drugNames} initialMutation={mutation} />
      </main>
    </>
  );
}
