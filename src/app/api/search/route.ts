import { search } from "@/lib/data";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return Response.json({ results: await search(q) });
}
