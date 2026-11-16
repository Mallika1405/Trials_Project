import Link from "next/link";
import SearchBox from "./SearchBox";

export default function Header({ showSearch = true }: { showSearch?: boolean }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
        <Link href="/" className="font-semibold tracking-tight">Mtb Explorer</Link>
        <nav className="hidden items-center gap-5 text-sm text-muted md:flex">
          <Link href="/" className="hover:text-foreground">Search</Link>
          <Link href="/graph?type=compound&id=bedaquiline" className="hover:text-foreground">Graph</Link>
          <Link href="/sources" className="hover:text-foreground">Sources</Link>
          <Link href="/about" className="hover:text-foreground">About</Link>
        </nav>
        <div className="ml-auto w-full max-w-sm">{showSearch && <SearchBox />}</div>
      </div>
    </header>
  );
}
