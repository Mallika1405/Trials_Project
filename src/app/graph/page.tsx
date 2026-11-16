import Header from "@/components/Header";
import GraphExplorer from "@/components/GraphExplorer";

export default async function GraphPage({ searchParams }: { searchParams: Promise<{ type?: string; id?: string }> }) {
  const { type = "compound", id = "bedaquiline" } = await searchParams;
  return (
    <>
      <Header />
      <main className="relative min-h-[560px] w-full flex-1">
        <GraphExplorer key={`${type}:${id}`} startType={type} startId={id} />
      </main>
    </>
  );
}
