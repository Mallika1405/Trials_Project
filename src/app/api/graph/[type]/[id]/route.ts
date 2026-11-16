import { getNeighbors, getStats } from "@/lib/data";

type T = "gene" | "compound" | "mutation" | "trial";
export async function GET(_: Request, ctx: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await ctx.params;
  const t = (type === "drug" ? "compound" : type) as T;
  const graph = await getNeighbors(t, id);
  const info = await getStats(type === "compound" || type === "drug" ? "drug" : (type as "gene"), id);
  return Response.json({ ...graph, ...info });
}
