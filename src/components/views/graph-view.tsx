"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { buildGraph, runForceSimulation, nodeRadius, type GraphNode, type GraphEdge } from "@/lib/graph-layout";
import type { Transaction } from "@/lib/types";

interface Props {
  transactions: Transaction[];
}

export default function GraphView({ transactions }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 500 });
  const [hovered, setHovered] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const animRef = useRef<number>(0);

  const { nodes, edges } = useMemo(() => buildGraph(transactions), [transactions]);

  const maxValue = useMemo(() => Math.max(...nodes.map((n) => n.value), 1), [nodes]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setSize({ width: w, height: Math.max(400, w * 0.6) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Run force simulation when data changes
  const layoutNodes = useMemo(() => {
    const copy = nodes.map((n) => ({ ...n, x: 0, y: 0, vx: 0, vy: 0 }));
    runForceSimulation(copy, edges, size.width, size.height);
    return copy;
  }, [nodes, edges, size]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    ctx.scale(dpr, dpr);

    const render = () => {
      ctx.clearRect(0, 0, size.width, size.height);

      // Background
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, size.width, size.height);

      // Edges
      for (const edge of edges) {
        const src = layoutNodes.find((n) => n.id === edge.source);
        const tgt = layoutNodes.find((n) => n.id === edge.target);
        if (!src || !tgt) continue;

        const isSelected =
          selectedNode === edge.source || selectedNode === edge.target;
        ctx.strokeStyle = isSelected
          ? "rgba(255,255,255,0.25)"
          : "rgba(255,255,255,0.06)";
        ctx.lineWidth = Math.min(3, 0.5 + edge.weight * 0.3);
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.stroke();
      }

      // Nodes
      for (const node of layoutNodes) {
        const r = nodeRadius(node.value, maxValue);
        const isHighlighted =
          selectedNode === node.id ||
          (selectedNode &&
            edges.some(
              (e) =>
                (e.source === selectedNode && e.target === node.id) ||
                (e.target === selectedNode && e.source === node.id),
            ));
        const alpha = selectedNode && !isHighlighted ? 0.25 : 1;

        // Glow for highlighted
        if (isHighlighted) {
          ctx.shadowColor = node.color;
          ctx.shadowBlur = 16;
        }

        // Fill
        ctx.fillStyle = node.color + Math.round(alpha * 255).toString(16).padStart(2, "0");
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.3})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label (for larger nodes)
        if (r > 14 || isHighlighted) {
          ctx.fillStyle = `rgba(255,255,255,${alpha * 0.9})`;
          ctx.font = `${9 + (isHighlighted ? 2 : 0)}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const label =
            node.label.length > 14
              ? node.label.slice(0, 12) + "…"
              : node.label;
          ctx.fillText(label, node.x, node.y);
        }
      }
    };

    render();
  }, [layoutNodes, edges, size, selectedNode, maxValue]);

  // Mouse interaction
  const getNodeAt = (mx: number, my: number): GraphNode | null => {
    for (const node of layoutNodes) {
      const r = nodeRadius(node.value, maxValue) + 4;
      const dx = node.x - mx;
      const dy = node.y - my;
      if (dx * dx + dy * dy < r * r) return node;
    }
    return null;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setHovered(getNodeAt(mx, my));
  };

  const handleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const node = getNodeAt(mx, my);
    setSelectedNode((prev) => (prev === node?.id ? null : node?.id ?? null));
  };

  const filteredCount = selectedNode
    ? transactions.filter((tx) => {
        const catKey = `cat:${tx.categoryName}`;
        const merchKey = `merchant:${tx.bankName ?? tx.receiverName ?? tx.title}`;
        const monthKey = `month:${tx.transactionDate.slice(0, 7)}`;
        return selectedNode === catKey || selectedNode === merchKey || selectedNode === monthKey;
      }).length
    : 0;

  return (
    <div ref={containerRef} className="relative w-full">
      <canvas
        ref={canvasRef}
        style={{ width: size.width, height: size.height, cursor: "pointer" }}
        className="rounded-lg"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />

      {/* Tooltip */}
      {hovered && (
        <div
          className="absolute pointer-events-none rounded-lg border border-white/10 bg-black/90 px-3 py-2 text-xs shadow-xl"
          style={{ left: hovered.x + 15, top: hovered.y - 10 }}
        >
          <div className="font-semibold text-white">{hovered.label}</div>
          <div className="text-white/50">
            {hovered.type === "category"
              ? "หมวดหมู่"
              : hovered.type === "merchant"
                ? "ผู้รับ/ธนาคาร"
                : "เดือน"}
          </div>
          <div className="text-white/70">
            ฿{hovered.value.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </div>
        </div>
      )}

      {/* Selection info */}
      {selectedNode && (
        <div className="absolute bottom-3 left-3 rounded-lg border border-white/10 bg-black/90 px-3 py-2 text-xs text-white/70">
          {filteredCount} รายการ
          <button
            className="ml-2 text-white/40 hover:text-white"
            onClick={() => setSelectedNode(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-white/40">
        <span>🟠 หมวดหมู่</span>
        <span>⚪ ผู้รับ/ธนาคาร</span>
        <span>⬤ เดือน</span>
        <span className="text-white/20">| ขนาด = จำนวนเงิน</span>
        <span className="text-white/20">| เส้น = ความถี่</span>
      </div>
    </div>
  );
}
