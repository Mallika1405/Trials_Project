import Header from "@/components/Header";

export default function About() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-14">
        <h1 className="text-3xl font-semibold tracking-tight">About</h1>
        <p className="mt-4 text-muted">Mtb Explorer connects Mycobacterium tuberculosis genes and protein targets to compounds, drugs, resistance mutations, structures and clinical trials, keeping the source of every relationship visible.</p>
        <p className="mt-4 text-muted">This build is a front-end prototype. All values are placeholders; no real datasets are loaded and no LLM is used.</p>
      </main>
    </>
  );
}
