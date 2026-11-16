"use client";
import { useEffect, useRef } from "react";

export interface Pt { x: number; y: number; z: number }
export interface Item {
  p: Pt; r: number; color: string; alpha?: number; label?: string; kind?: "atom" | "residue";
}
export interface Seg { a: Pt; b: Pt; w: number; color: string; alpha?: number }

interface Props {
  items: Item[];
  segs: Seg[];
  scale: number; // world units -> px at zoom 1
  onInteract?: () => void;
  resetKey?: number;
  idleSpin?: boolean;
  spinSpeed?: number;
  label?: string;
}

/** Tiny dependency-free orbit viewer used by the demo. Swap for Mol* or 3Dmol later. */
export default function Viewer3D({ items, segs, scale, resetKey = 0, idleSpin = true, spinSpeed = 0.004, onInteract, label }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef({ yaw: 0.6, pitch: -0.3, zoom: 1, idle: idleSpin, drag: false, lx: 0, ly: 0 });
  const data = useRef({ items, segs, scale, label });
  useEffect(() => { data.current = { items, segs, scale, label }; });

  useEffect(() => {
    state.current = { yaw: 0.6, pitch: -0.3, zoom: 1, idle: idleSpin, drag: false, lx: 0, ly: 0 };
  }, [resetKey, idleSpin]);

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    let raf = 0;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const r = cv.getBoundingClientRect();
      cv.width = r.width * dpr; cv.height = r.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit); ro.observe(cv);

    const draw = () => {
      const s = state.current;
      if (s.idle) s.yaw += spinSpeed;
      const { items, segs, scale } = data.current;
      const W = cv.clientWidth, H = cv.clientHeight;
      ctx.clearRect(0, 0, W, H);
      const cy = Math.cos(s.yaw), sy = Math.sin(s.yaw), cp = Math.cos(s.pitch), sp = Math.sin(s.pitch);
      const proj = (p: Pt) => {
        const x1 = p.x * cy + p.z * sy, z1 = -p.x * sy + p.z * cy;
        const y2 = p.y * cp - z1 * sp, z2 = p.y * sp + z1 * cp;
        const k = scale * s.zoom * (1 + z2 * 0.0015);
        return { x: W / 2 + x1 * k, y: H / 2 + y2 * k, z: z2, k };
      };
      type D = { z: number; fn: () => void };
      const ds: D[] = [];
      for (const g of segs) {
        const a = proj(g.a), b = proj(g.b);
        ds.push({ z: (a.z + b.z) / 2, fn: () => {
          ctx.globalAlpha = g.alpha ?? 1; ctx.strokeStyle = g.color; ctx.lineWidth = g.w * s.zoom; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        } });
      }
      for (const it of items) {
        const q = proj(it.p);
        ds.push({ z: q.z, fn: () => {
          ctx.globalAlpha = it.alpha ?? 1; ctx.fillStyle = it.color;
          const rad = it.r * q.k;
          ctx.beginPath(); ctx.arc(q.x, q.y, rad, 0, Math.PI * 2); ctx.fill();
          if (it.label) {
            ctx.globalAlpha = 1; ctx.fillStyle = "#111"; ctx.font = "600 12px system-ui";
            ctx.fillText(it.label, q.x + rad + 6, q.y + 4);
          }
        } });
      }
      ds.sort((a, b) => a.z - b.z).forEach((d) => d.fn());
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    draw();

    const stop = () => { if (state.current.idle) { state.current.idle = false; onInteract?.(); } };
    const down = (e: PointerEvent) => { state.current.drag = true; state.current.lx = e.clientX; state.current.ly = e.clientY; cv.setPointerCapture(e.pointerId); stop(); };
    const move = (e: PointerEvent) => {
      const s = state.current; if (!s.drag) return;
      s.yaw += (e.clientX - s.lx) * 0.008; s.pitch += (e.clientY - s.ly) * 0.008;
      s.pitch = Math.max(-1.4, Math.min(1.4, s.pitch)); s.lx = e.clientX; s.ly = e.clientY;
    };
    const up = () => { state.current.drag = false; };
    const wheel = (e: WheelEvent) => {
      e.preventDefault(); stop();
      state.current.zoom = Math.max(0.5, Math.min(3, state.current.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
    };
    cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerup", up); cv.addEventListener("wheel", wheel, { passive: false });
    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      cv.removeEventListener("pointerdown", down); cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerup", up); cv.removeEventListener("wheel", wheel);
    };
  }, [onInteract, spinSpeed]);

  return <canvas ref={ref} aria-label={label} className="h-full w-full cursor-grab touch-none active:cursor-grabbing" />;
}
