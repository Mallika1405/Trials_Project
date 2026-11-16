"use client";
import { useMemo, useState } from "react";
import Viewer3D, { Item, Seg } from "./Viewer3D";

type A = { x: number; y: number; z: number; el: "C" | "N" | "O" | "Br" };
// Placeholder fused-ring scaffold — NOT any real compound's geometry.
function scaffold(seed: number) {
  const atoms: A[] = []; const bonds: [number, number][] = [];
  const ring = (cx: number, cy: number, start: number) => {
    const idx: number[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      atoms.push({ x: cx + Math.cos(a) * 1.4, y: cy + Math.sin(a) * 1.4, z: (i % 2 ? 0.25 : -0.25), el: "C" });
      idx.push(start + i);
    }
    for (let i = 0; i < 6; i++) bonds.push([idx[i], idx[(i + 1) % 6]]);
  };
  ring(0, 0, 0);
  ring(2.425, 0, 6);
  const chain = [[-1.2, 2.2, 0.8, "N"], [-2.4, 3.2, 1.6, "C"], [-3.6, 2.8, 2.4, "O"], [3.6, 2.2, -0.9, "C"], [4.8, 3.0, -1.7, seed % 2 ? "Br" : "N"]] as const;
  const anchors = [2, 3, 5, 8, 9];
  atoms.push({ x: chain[0][0], y: chain[0][1], z: chain[0][2], el: "N" }); bonds.push([2, 12]);
  atoms.push({ x: chain[1][0], y: chain[1][1], z: chain[1][2], el: "C" }); bonds.push([12, 13]);
  atoms.push({ x: chain[2][0], y: chain[2][1], z: chain[2][2], el: "O" }); bonds.push([13, 14]);
  atoms.push({ x: chain[3][0], y: chain[3][1], z: chain[3][2], el: "C" }); bonds.push([anchors[3], 15]);
  atoms.push({ x: chain[4][0], y: chain[4][1], z: chain[4][2], el: chain[4][2] ? (seed % 2 ? "Br" : "N") : "N" }); bonds.push([15, 16]);
  return { atoms, bonds };
}
const COLOR = { C: "#4b5563", N: "#2563eb", O: "#dc2626", Br: "#92400e" } as const;
const VDW = { C: 0.62, N: 0.58, O: 0.55, Br: 0.8 } as const;

export default function MoleculeViewer({ seed = 1, caption = "Computed 3D conformer · PubChem" }: { seed?: number; caption?: string }) {
  const [view, setView] = useState<"2d" | "3d">("3d");
  const [style, setStyle] = useState<"ball" | "space">("ball");
  const [resetKey, setResetKey] = useState(0);
  const [spinning, setSpinning] = useState(true);
  const mol = useMemo(() => scaffold(seed), [seed]);

  const { items, segs } = useMemo(() => {
    const c = { x: 0.6, y: 1, z: 0 };
    const at = (a: A) => ({ x: a.x - c.x - 1, y: -(a.y - c.y), z: a.z });
    const items: Item[] = mol.atoms.map((a) => ({
      p: at(a), r: (style === "space" ? VDW[a.el] : 0.28) * 0.5, color: COLOR[a.el], alpha: style === "space" ? 0.9 : 1,
    }));
    const segs: Seg[] = style === "space" ? [] : mol.bonds.map(([i, j]) => ({ a: at(mol.atoms[i]), b: at(mol.atoms[j]), w: 5, color: "#9ca3af" }));
    return { items, segs };
  }, [mol, style]);

  // 2D drawing: flat projection of the same scaffold.
  const flat = useMemo(() => {
    const xs = mol.atoms.map((a) => a.x), ys = mol.atoms.map((a) => a.y);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const s = 42;
    return { pts: mol.atoms.map((a) => ({ x: 40 + (a.x - minX) * s, y: 40 + (a.y - minY) * s, el: a.el })) };
  }, [mol]);

  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-[360px] flex-1 overflow-hidden rounded-xl border border-line bg-[#f4f4f2]">
        <div className={`absolute inset-0 transition-opacity duration-300 ${view === "3d" ? "opacity-100" : "pointer-events-none opacity-0"}`}>
          <Viewer3D items={items} segs={segs} scale={44} resetKey={resetKey} idleSpin={spinning} spinSpeed={0.0025} onInteract={() => setSpinning(false)} label="3D molecule viewer (demo placeholder)" />
        </div>
        <div className={`absolute inset-0 flex items-center justify-center bg-[#fbfbfa] transition-opacity duration-300 ${view === "2d" ? "opacity-100" : "pointer-events-none opacity-0"}`}>
          <svg viewBox="0 0 320 260" className="h-4/5 w-4/5" role="img" aria-label="2D chemical drawing (demo placeholder)">
            {mol.bonds.map(([i, j], k) => (
              <line key={k} x1={flat.pts[i].x} y1={flat.pts[i].y} x2={flat.pts[j].x} y2={flat.pts[j].y} stroke="#111" strokeWidth={1.6} />
            ))}
            {flat.pts.map((p, i) => p.el !== "C" && (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={9} fill="#fbfbfa" />
                <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize="12" fill={COLOR[p.el]} fontWeight={600}>{p.el}</text>
              </g>
            ))}
          </svg>
        </div>
        <div className="absolute left-3 top-3 flex gap-1 text-xs">
          {(["2d", "3d"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-md border px-2 py-1 uppercase ${view === v ? "border-accent text-accent" : "border-line bg-panel hover:border-foreground"}`}>{v}</button>
          ))}
        </div>
        {view === "3d" && (
          <div className="absolute right-3 top-3 flex gap-1 text-xs">
            <button className="rounded-md border border-line bg-panel px-2 py-1 hover:border-foreground" onClick={() => { setResetKey((k) => k + 1); setSpinning(true); }}>Reset</button>
            <button onClick={() => setStyle("ball")} className={`rounded-md border px-2 py-1 ${style === "ball" ? "border-accent text-accent" : "border-line bg-panel hover:border-foreground"}`}>Ball + stick</button>
            <button onClick={() => setStyle("space")} className={`rounded-md border px-2 py-1 ${style === "space" ? "border-accent text-accent" : "border-line bg-panel hover:border-foreground"}`}>Space filling</button>
          </div>
        )}
      </div>
      <div className="mt-3 text-xs text-muted">
        {view === "3d" ? caption : "2D depiction · PubChem"}
        <span className="ml-2 rounded bg-line px-1.5 py-0.5">demo geometry</span>
      </div>
    </div>
  );
}
