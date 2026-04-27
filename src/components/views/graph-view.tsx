"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  buildGraph,
  runForceSimulation,
  nodeRadius,
  type GraphNode,
  type GraphEdge,
} from "@/lib/graph-layout";
import type { Transaction } from "@/lib/types";

const ZOOM_MIN = 0.2;
const ZOOM_MAX = 4;

export default function GraphView({ transactions }: { transactions: Transaction[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [size, setSize] = useState({ width: 800, height: 560 });
  const sizeRef = useRef(size);

  // React state for JSX overlays only
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Refs for the stable render loop — never trigger re-renders
  const hoveredRef = useRef<GraphNode | null>(null);
  const selectedRef = useRef<string | null>(null);
  const layoutNodesRef = useRef<GraphNode[]>([]);
  const nodeMapRef = useRef(new Map<string, GraphNode>());
  const edgesRef = useRef<GraphEdge[]>([]);
  const maxValueRef = useRef(1);

  // Pan / zoom (mutated directly, no setState)
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const panStartRef = useRef({ mx: 0, my: 0, tx: 0, ty: 0 });
  const isPanningRef = useRef(false);
  const panMovedRef = useRef(false);

  const dirtyRef = useRef(true);
  const rafRef = useRef(0);

  // Graph data
  const { nodes, edges } = useMemo(() => buildGraph(transactions), [transactions]);
  const maxValue = useMemo(() => Math.max(...nodes.map((n) => n.value), 1), [nodes]);

  // Sync refs
  useEffect(() => { sizeRef.current = size; dirtyRef.current = true; }, [size]);
  useEffect(() => { selectedRef.current = selectedNode; dirtyRef.current = true; }, [selectedNode]);
  useEffect(() => { hoveredRef.current = hoveredNode; dirtyRef.current = true; }, [hoveredNode]);
  useEffect(() => { edgesRef.current = edges; dirtyRef.current = true; }, [edges]);
  useEffect(() => { maxValueRef.current = maxValue; dirtyRef.current = true; }, [maxValue]);

  // Force layout (re-runs only when node IDs change)
  const layoutKey = useMemo(() => nodes.map((n) => n.id).sort().join("|"), [nodes]);
  const prevLayoutKeyRef = useRef("");
  useEffect(() => {
    if (layoutKey === prevLayoutKeyRef.current) return;
    prevLayoutKeyRef.current = layoutKey;
    const { width: W, height: H } = sizeRef.current;
    const copy = nodes.map((n) => ({ ...n, x: 0, y: 0, vx: 0, vy: 0 }));
    runForceSimulation(copy, edgesRef.current, W, H);
    layoutNodesRef.current = copy;
    const m = new Map<string, GraphNode>();
    for (const n of copy) m.set(n.id, n);
    nodeMapRef.current = m;
    dirtyRef.current = true;
  }, [layoutKey, nodes]);

  // Resize observer (debounced via rAF)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let pending = 0;
    const ro = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        const w = entry.contentRect.width;
        setSize({ width: w, height: Math.max(480, Math.round(w * 0.62)) });
      });
    });
    ro.observe(el);
    return () => { ro.disconnect(); cancelAnimationFrame(pending); };
  }, []);

  // Non-passive wheel handler (must be native, React wheel is passive)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = e.deltaMode === 0 ? 0.001 : 0.04;
      const t = transformRef.current;
      const newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, t.scale * (1 + -e.deltaY * factor)));
      const ratio = newScale / t.scale;
      t.x = cx - ratio * (cx - t.x);
      t.y = cy - ratio * (cy - t.y);
      t.scale = newScale;
      dirtyRef.current = true;
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  // Stable render loop — reads all state from refs, never restarts
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      if (!dirtyRef.current) return;
      dirtyRef.current = false;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const { width: W, height: H } = sizeRef.current;
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.round(W * dpr);
      const targetH = Math.round(H * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const { x: tx, y: ty, scale: ts } = transformRef.current;
      const lnodes = layoutNodesRef.current;
      const ledges = edgesRef.current;
      const maxVal = maxValueRef.current;
      const sel = selectedRef.current;
      const hov = hoveredRef.current;

      // ── Background ──────────────────────────────────────────────────────
      ctx.fillStyle = "#0d0d10";
      ctx.fillRect(0, 0, W, H);

      // ── Obsidian dot grid ────────────────────────────────────────────────
      const baseSpacing = 30;
      const dotSpacing = baseSpacing * ts;
      const ox = ((tx % dotSpacing) + dotSpacing) % dotSpacing;
      const oy = ((ty % dotSpacing) + dotSpacing) % dotSpacing;
      const dotOpacity = Math.min(0.07, 0.04 + ts * 0.012);
      ctx.fillStyle = `rgba(255,255,255,${dotOpacity})`;
      for (let gx = ox - dotSpacing; gx < W + dotSpacing; gx += dotSpacing) {
        for (let gy = oy - dotSpacing; gy < H + dotSpacing; gy += dotSpacing) {
          ctx.beginPath();
          ctx.arc(gx, gy, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.save();
      ctx.translate(tx, ty);
      ctx.scale(ts, ts);

      // ── Edges ────────────────────────────────────────────────────────────
      for (const edge of ledges) {
        const src = nodeMapRef.current.get(edge.source);
        const tgt = nodeMapRef.current.get(edge.target);
        if (!src || !tgt) continue;

        const isSelEdge = sel === edge.source || sel === edge.target;
        const alpha = sel
          ? isSelEdge ? 0.4 : 0.04
          : 0.11;

        ctx.strokeStyle = `rgba(148,163,184,${alpha})`;
        ctx.lineWidth = Math.max(0.35, (0.4 + edge.weight * 0.18)) / ts;

        // Quadratic bezier for organic look
        const mx = (src.x + tgt.x) / 2;
        const my = (src.y + tgt.y) / 2;
        const ddx = tgt.x - src.x;
        const ddy = tgt.y - src.y;
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.quadraticCurveTo(mx - ddy * 0.09, my + ddx * 0.09, tgt.x, tgt.y);
        ctx.stroke();
      }

      // ── Nodes ────────────────────────────────────────────────────────────
      for (const node of lnodes) {
        const r = nodeRadius(node.value, maxVal);
        const isLinked =
          sel != null &&
          ledges.some(
            (e) =>
              (e.source === sel && e.target === node.id) ||
              (e.target === sel && e.source === node.id),
          );
        const isHighlighted = sel === node.id || isLinked;
        const isFaded = sel != null && !isHighlighted;
        const isHov = hov?.id === node.id;
        const alpha = isFaded ? 0.13 : 1;

        // Glow halo
        if (isHighlighted || isHov) {
          ctx.shadowColor = node.color;
          ctx.shadowBlur = isHov ? 26 : 18;
        }

        // Radial gradient fill for sphere-like depth
        const gr = ctx.createRadialGradient(
          node.x - r * 0.28, node.y - r * 0.28, r * 0.05,
          node.x, node.y, r,
        );
        gr.addColorStop(0, hexAlpha(node.color, Math.min(1, alpha * 1.45)));
        gr.addColorStop(1, hexAlpha(node.color, alpha * 0.72));
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        // Ring border
        ctx.strokeStyle = isHighlighted
          ? `rgba(255,255,255,${alpha * 0.55})`
          : `rgba(255,255,255,${alpha * 0.1})`;
        ctx.lineWidth = (isHighlighted ? 1.5 : 0.7) / ts;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.stroke();

        // Label
        const minLabelR = 11 / ts;
        if (r > minLabelR || isHighlighted || isHov) {
          const sz = Math.max(8, Math.min(12, r * 0.6 + (isHighlighted || isHov ? 1.5 : 0)));
          ctx.fillStyle = `rgba(255,255,255,${alpha * (isHighlighted || isHov ? 0.95 : 0.7)})`;
          ctx.font = `${sz / ts}px -apple-system, "SF Pro Text", system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const lbl = node.label.length > 14 ? `${node.label.slice(0, 12)}…` : node.label;
          ctx.fillText(lbl, node.x, node.y);
        }
      }

      ctx.restore();
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Stable — reads everything from refs

  // ── Helpers ──────────────────────────────────────────────────────────────
  const canvasToWorld = (cx: number, cy: number) => {
    const { x, y, scale } = transformRef.current;
    return { x: (cx - x) / scale, y: (cy - y) / scale };
  };

  const getNodeAt = (cx: number, cy: number): GraphNode | null => {
    const { x: wx, y: wy } = canvasToWorld(cx, cy);
    const mv = maxValueRef.current;
    const hitPad = 6 / transformRef.current.scale;
    for (const node of layoutNodesRef.current) {
      const r = nodeRadius(node.value, mv) + hitPad;
      const dx = node.x - wx;
      const dy = node.y - wy;
      if (dx * dx + dy * dy < r * r) return node;
    }
    return null;
  };

  // ── Mouse handlers ────────────────────────────────────────────────────────
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.mx;
      const dy = e.clientY - panStartRef.current.my;
      if (Math.abs(dx) + Math.abs(dy) > 3) panMovedRef.current = true;
      transformRef.current.x = panStartRef.current.tx + dx;
      transformRef.current.y = panStartRef.current.ty + dy;
      dirtyRef.current = true;
      return;
    }

    const node = getNodeAt(cx, cy);
    if (node?.id !== hoveredRef.current?.id) {
      setHoveredNode(node);
    }
    if (node) setTooltipPos({ x: cx + 18, y: cy - 10 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanningRef.current = true;
    panMovedRef.current = false;
    panStartRef.current = {
      mx: e.clientX,
      my: e.clientY,
      tx: transformRef.current.x,
      ty: transformRef.current.y,
    };
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const wasPanning = isPanningRef.current;
    isPanningRef.current = false;
    if (canvasRef.current) canvasRef.current.style.cursor = "grab";
    if (!wasPanning || panMovedRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const node = getNodeAt(e.clientX - rect.left, e.clientY - rect.top);
    setSelectedNode((prev) => (prev === node?.id ? null : node?.id ?? null));
  };

  const resetView = () => {
    transformRef.current = { x: 0, y: 0, scale: 1 };
    dirtyRef.current = true;
  };

  const zoomIn = () => {
    transformRef.current.scale = Math.min(ZOOM_MAX, transformRef.current.scale * 1.3);
    dirtyRef.current = true;
  };

  const zoomOut = () => {
    transformRef.current.scale = Math.max(ZOOM_MIN, transformRef.current.scale * 0.77);
    dirtyRef.current = true;
  };

  const filteredCount = selectedNode
    ? transactions.filter((tx) => {
        const catKey = `cat:${tx.categoryName}`;
        const merchKey = `merchant:${tx.bankName ?? tx.receiverName ?? tx.title}`;
        const monthKey = `month:${tx.transactionDate.slice(0, 7)}`;
        return (
          selectedNode === catKey ||
          selectedNode === merchKey ||
          selectedNode === monthKey
        );
      }).length
    : 0;

  const nodeCount = layoutNodesRef.current.length;
  const edgeCount = edgesRef.current.length;

  if (transactions.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 rounded-xl border border-white/[0.08] bg-[#0d0d10] text-center">
        <div className="text-white/20 text-[13px]">No transactions to graph yet</div>
        <div className="text-white/12 text-[11px]">Upload a slip to see your spending network</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full select-none">
      <canvas
        ref={canvasRef}
        style={{ width: size.width, height: size.height, cursor: "grab" }}
        className="rounded-xl"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          isPanningRef.current = false;
          if (canvasRef.current) canvasRef.current.style.cursor = "grab";
          setHoveredNode(null);
        }}
      />

      {/* Top-left: stats badge */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-lg border border-white/[0.09] bg-black/50 backdrop-blur-md px-2.5 py-1.5 text-[11px] text-white/35">
        <span>{nodeCount} nodes</span>
        <span className="text-white/15">·</span>
        <span>{edgeCount} links</span>
      </div>

      {/* Top-right: controls */}
      <div className="absolute top-3 right-3 flex gap-1">
        {[
          { label: "⌂", title: "Reset view", action: resetView },
          { label: "+", title: "Zoom in", action: zoomIn },
          { label: "−", title: "Zoom out", action: zoomOut },
        ].map((btn) => (
          <button
            key={btn.label}
            title={btn.title}
            onClick={btn.action}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/[0.09] bg-black/50 backdrop-blur-md text-[13px] text-white/45 hover:text-white/85 hover:border-white/20 hover:bg-black/70 transition-all duration-150"
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Hover tooltip */}
      {hoveredNode && (
        <div
          className="absolute pointer-events-none rounded-xl border border-white/[0.1] bg-black/80 backdrop-blur-xl px-3.5 py-2.5 shadow-2xl"
          style={{ left: tooltipPos.x, top: tooltipPos.y, maxWidth: 210 }}
        >
          <div className="font-semibold text-white text-[13px] leading-tight">
            {hoveredNode.label}
          </div>
          <div className="mt-0.5 text-white/40 text-[11px]">
            {hoveredNode.type === "category"
              ? "Category"
              : hoveredNode.type === "merchant"
                ? "Merchant · Bank"
                : "Month"}
          </div>
          <div className="mt-1.5 font-mono text-white/80 text-[12px]">
            ฿{hoveredNode.value.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </div>
        </div>
      )}

      {/* Selection info pill */}
      {selectedNode && (
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-xl border border-white/[0.09] bg-black/75 backdrop-blur-md px-3 py-2 text-xs">
          <span className="font-medium text-white/85">{filteredCount} transactions</span>
          <button
            className="ml-1 rounded-md px-1.5 py-0.5 text-white/30 hover:text-white/70 hover:bg-white/[0.08] transition-colors text-[11px]"
            onClick={() => setSelectedNode(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Legend + instructions */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-white/25">
        <LegendDot color="#f97316" label="Category" />
        <LegendDot color="#94a3b8" label="Merchant · Bank" />
        <LegendDot color="#475569" label="Month" />
        <span className="text-white/15">· Scroll to zoom · Drag to pan · Click to select</span>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block w-2 h-2 rounded-full opacity-70"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}
