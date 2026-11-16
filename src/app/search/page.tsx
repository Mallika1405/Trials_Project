import Link from "next/link";
import Header from "@/components/Header";
import { TypeTag } from "@/components/ui";
import { search } from "@/lib/data";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const hits = await search(q);
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Results for “{q}”</h1>
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {hits.length === 0 && <li className="py-6 text-muted">No matches found.</li>}
          {hits.map((h) => (
            <li key={h.href}>
              <Link href={h.href} className="flex items-center justify-between gap-6 py-4 hover:bg-accent-soft/50">
                <span>
                  <span className="block text-lg font-medium">{h.title}</span>
                  <span className="block text-sm text-muted">{h.subtitle}</span>
                </span>
                <TypeTag type={h.type} />
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
