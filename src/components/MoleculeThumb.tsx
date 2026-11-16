export default function MoleculeThumb({ seed = 1 }: { seed?: number }) {
  const r = 8 + (seed % 3);
  return (
    <svg viewBox="0 0 48 48" className="h-10 w-10 shrink-0 rounded-md border border-line bg-panel" aria-hidden>
      <g fill="none" stroke="#6b6b6b" strokeWidth="1.3">
        <polygon points={hex(18, 24, r)} /><polygon points={hex(18 + r * 1.73, 24, r)} />
      </g>
    </svg>
  );
}
function hex(cx: number, cy: number, r: number) {
  return [0, 1, 2, 3, 4, 5].map((i) => { const a = Math.PI / 3 * i + Math.PI / 6; return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`; }).join(" ");
}
