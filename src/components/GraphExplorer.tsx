"use client";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Background, Handle, Position, ReactFlow, ReactFlowProvider, useNodesInitialized, useReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import type { GraphEdge, GraphNode } from "@/lib/types";
import { TYPE_LABEL } from "@/lib/format";

const COLORS: Record<string, string> = {
  gene: "#0e7490", protein: "#0e7490", mutation: "#b45309", compound: "#6b7280", drug: "#111111", trial: "#7c3aed",
};
type Data = { g: GraphNode; selected: boolean; onPath: boolean };

function NodeView({ data }: NodeProps<Node<Data>>) {
  const { g, selected } = data;
  return (
    <div
      className="rounded-lg border bg-white px-3 py-2 text-sm transition-all duration-200"
      style={{ borderColor: selected ? "#0e7490" : "#e7e7e5", transform: selected ? "scale(1.06)" : "none", boxShadow: selected ? "0 0 0 3px #e6f3f6" : "none" }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0, top: "50%", left: "50%" }} />
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: COLORS[g.type] }} />
        <span className="font-medium">{g.label}</span>
      </div>
      <div className="text-[11px] text-muted">{TYPE_LABEL[g.type]}</div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, top: "50%", left: "50%" }} />
    </div>
  );
}
const nodeTypes = { entity: NodeView };


/** Rings around the centre by graph distance; deeper nodes sit beyond their parents. */
function ringLayout(centerId: string, nodes: GraphNode[], edges: GraphEdge[]) {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    adj.set(e.source, [...(adj.get(e.source) ?? []), e.target]);
    adj.set(e.target, [...(adj.get(e.target) ?? []), e.source]);
  }
  const depth = new Map<string, number>([[centerId, 0]]);
  const queue = [centerId];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of adj.get(cur) ?? []) if (!depth.has(n)) { depth.set(n, depth.get(cur)! + 1); queue.push(n); }
  }
  const pos = new Map<string, { x: number; y: number }>([[centerId, { x: 0, y: 0 }]]);
  const angle = new Map<string, number>();
  const level = (d: number) => nodes.filter((n) => depth.get(n.id) === d);
  const l1 = level(1);
  l1.forEach((n, i) => {
    const a = (Math.PI * 2 * i) / Math.max(l1.length, 1) - Math.PI / 2;
    angle.set(n.id, a);
    pos.set(n.id, { x: Math.cos(a) * 210, y: Math.sin(a) * 170 });
  });
  const l2 = level(2).map((n) => {
    const parents = (adj.get(n.id) ?? []).filter((p) => depth.get(p) === 1);
    const sx = parents.reduce((t, p) => t + Math.cos(angle.get(p) ?? 0), 0);
    const sy = parents.reduce((t, p) => t + Math.sin(angle.get(p) ?? 0), 0);
    return { n, a: Math.atan2(sy, sx) };
  }).sort((x, y) => x.a - y.a);
  // keep outer nodes from sitting on top of each other
  for (let i = 1; i < l2.length; i++) if (l2[i].a - l2[i - 1].a < 0.55) l2[i].a = l2[i - 1].a + 0.55;
  l2.forEach(({ n, a }) => pos.set(n.id, { x: Math.cos(a) * 430, y: Math.sin(a) * 330 }));
  return pos;
}

interface Inspect { node: GraphNode; stats: Record<string, number>; summary: string }

function Inner({ startType, startId }: { startType: string; startId: string }) {
  const [nodes, setNodes] = useState<Node<Data>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [path, setPath] = useState<string[]>([]);
  const [inspect, setInspect] = useState<Inspect | null>(null);
  const expanded = useRef(new Set<string>());
  const rf = useReactFlow();
  const measured = useNodesInitialized();
  const [help, setHelp] = useState(false);

  const fetchNeighbors = useCallback(async (type: string, id: string) => {
    const r = await fetch(`/api/graph/${type}/${encodeURIComponent(id)}`);
    return (await r.json()) as { nodes: GraphNode[]; edges: GraphEdge[]; stats: Record<string, number>; summary: string };
  }, []);

  const merge = useCallback((newNodes: GraphNode[], newEdges: GraphEdge[], origin: { x: number; y: number }, focusId: string) => {
    setNodes((cur) => {
      const have = new Set(cur.map((n) => n.id));
      const fresh = newNodes.filter((n) => !have.has(n.id));
      const R = 230;
      // Fan new nodes outward, away from the middle of the graph, so they don't pile on old ones.
      const out = origin.x === 0 && origin.y === 0 ? null : Math.atan2(origin.y, origin.x);
      const spread = out === null ? Math.PI * 2 : Math.min(Math.PI * 1.2, 0.9 * Math.max(fresh.length, 1));
      const added: Node<Data>[] = fresh.map((g, i) => {
        const t = fresh.length > 1 ? i / (fresh.length - 1) : 0.5;
        const a = out === null
          ? (Math.PI * 2 * i) / Math.max(fresh.length, 1) - Math.PI / 2
          : out - spread / 2 + spread * t;
        return { id: g.id, type: "entity", position: { x: origin.x + Math.cos(a) * R, y: origin.y + Math.sin(a) * R * 0.8 }, data: { g, selected: false, onPath: false } };
      });
      return [...cur, ...added];
    });
    setEdges((cur) => {
      const have = new Set(cur.map((e) => e.id));
      return [...cur, ...newEdges.filter((e) => !have.has(e.id)).map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label, type: "straight", style: { stroke: "#c9c9c6", strokeWidth: 1.2 }, labelStyle: { fontSize: 10, fill: "#6b6b6b" }, labelBgStyle: { fill: "#fcfcfb" } }))];
    });
    setSelected(focusId);
  }, []);

  // initial: first-degree only
  useEffect(() => {
    let live = true;
    (async () => {
      const { nodes: ns, edges: es, stats, summary } = await fetchNeighbors(startType, startId);
      if (!live || ns.length === 0) return;
      const center = ns.find((n) => n.id === `${startType === "drug" ? "compound" : startType}:${startId}`) ?? ns[0];
      expanded.current.add(center.id);
      // the start view already includes everything up to two steps away (e.g. gene → mutation → drug)
      expanded.current = new Set([center.id]);
      const pos = ringLayout(center.id, ns, es);
      setNodes(ns.map((g) => ({ id: g.id, type: "entity", position: pos.get(g.id) ?? { x: 0, y: 0 }, data: { g, selected: g.id === center.id, onPath: g.id === center.id } })));
      setEdges(es.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label, type: "straight", style: { stroke: "#c9c9c6", strokeWidth: 1.2 }, labelStyle: { fontSize: 10, fill: "#6b6b6b" }, labelBgStyle: { fill: "#fcfcfb" } })));
      setSelected(center.id);
      setPath([center.id]);
      setInspect({ node: center, stats, summary });
    })();
    return () => { live = false; };
  }, [startType, startId, fetchNeighbors, merge]);

  // Fit whenever the set of nodes changes and all are measured.
  useEffect(() => {
    if (measured) rf.fitView({ padding: 0.25, duration: 250 });
  }, [measured, nodes.length, rf]);

  const onNodeClick = useCallback(async (_: unknown, node: Node<Data>) => {
    const g = node.data.g;
    setSelected(g.id);
    setPath((p) => (p.includes(g.id) ? p.slice(0, p.indexOf(g.id) + 1) : [...p, g.id]));
    const [type, ...rest] = g.id.split(":");
    const id = rest.join(":");
    const apiType = type === "drug" ? "compound" : type;
    const { nodes: ns, edges: es, stats, summary } = await fetchNeighbors(apiType, id);
    setInspect({ node: g, stats, summary });
    if (!expanded.current.has(g.id)) {
      expanded.current.add(g.id);
      merge(ns, es, node.position, g.id);
    }
  }, [fetchNeighbors, merge]);

  const shownNodes = nodes.map((n) => ({ ...n, data: { ...n.data, selected: n.id === selected, onPath: path.includes(n.id) } }));
  const pathEdges = new Set<string>();
  edges.forEach((e) => { const i = path.indexOf(e.source), j = path.indexOf(e.target); if (i >= 0 && j >= 0 && Math.abs(i - j) === 1) pathEdges.add(e.id); });
  const shownEdges = edges.map((e) => pathEdges.has(e.id) || (selected && (e.source === selected || e.target === selected))
    ? { ...e, style: { stroke: "#0e7490", strokeWidth: pathEdges.has(e.id) ? 2.6 : 1.8 } } : e);

  const href = inspect ? (inspect.node.href.startsWith("/trial") || inspect.node.href.startsWith("/gene") || inspect.node.href.startsWith("/compound") ? inspect.node.href : "/") : "/";

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-y-0 left-0 right-72">
      <ReactFlow
        nodes={shownNodes} edges={shownEdges} nodeTypes={nodeTypes} onNodeClick={onNodeClick}
        fitView fitViewOptions={{ padding: 0.3 }} nodesDraggable proOptions={{ hideAttribution: true }} minZoom={0.4}
      >
        <Background gap={28} color="#ececea" />
      </ReactFlow>
      </div>
      <div className="absolute left-4 top-4 z-10 max-w-[280px]">
        <button onClick={() => setHelp((h) => !h)} className="rounded-lg border border-line bg-panel px-3 py-1.5 text-xs text-muted hover:border-foreground hover:text-foreground">
          {help ? "Hide help" : "How to read this"}
        </button>
        {help && (
          <div className="fade-up mt-2 rounded-lg border border-line bg-panel p-3 text-xs text-muted">
            <div className="mb-2 text-foreground">Read each line as a sentence: box — label — box.</div>
        <div>Example: “R94W — is a change in — Rv0678”. Click any box to see what it connects to; the right panel explains it in plain words.</div>
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1">
          {(["gene", "mutation", "drug", "compound", "trial"] as const).map((t) => (
            <li key={t} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[t] }} />{TYPE_LABEL[t]}</li>
          ))}
        </ul>
      
          </div>
        )}
      </div>
      <aside className="absolute right-0 top-0 h-full w-72 border-l border-line bg-panel p-5">
        {inspect && (
          <div className="fade-up flex flex-col gap-4">
            <div>
              <div className="text-xl font-medium">{inspect.node.label}</div>
              <div className="text-xs text-muted">{TYPE_LABEL[inspect.node.type]}{inspect.node.meta ? ` · ${inspect.node.meta}` : ""}</div>
            </div>
            {inspect.summary && (
              <div className="rounded-lg bg-accent-soft p-3 text-sm">
                <div className="mb-1 text-xs font-medium text-accent">What this means</div>
                {inspect.summary}
              </div>
            )}
            <ul className="text-sm">
              {Object.entries(inspect.stats).map(([k, v]) => (
                <li key={k} className="flex justify-between border-b border-line py-2 last:border-0"><span className="text-muted">{k}</span><span>{v}</span></li>
              ))}
            </ul>
            <Link href={href} className="rounded-lg bg-foreground px-3 py-2 text-center text-sm text-background hover:opacity-90">Open full page</Link>
          </div>
        )}
      </aside>
    </div>
  );
}

export default function GraphExplorer(props: { startType: string; startId: string }) {
  return <ReactFlowProvider><Inner {...props} /></ReactFlowProvider>;
}
