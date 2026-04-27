import type { Transaction } from "@/lib/types";

export interface GraphNode {
  id: string;
  label: string;
  type: "category" | "merchant" | "bank" | "month";
  value: number;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  "อาหาร": "#f97316", "บิล/บริการ": "#3b82f6", "เดินทาง": "#8b5cf6",
  "ช้อปปิ้ง": "#ec4899", "สุขภาพ": "#22c55e", "การศึกษา": "#eab308",
  "ความบันเทิง": "#ef4444", "อื่น ๆ": "#6b7280",
};

function colorFor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS["อื่น ๆ"];
}

function monthLabel(iso: string): string {
  const [y, m] = iso.split("-");
  const thaiMonths = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${thaiMonths[+m]} ${(+y + 543) % 100}`;
}

export function buildGraph(transactions: Transaction[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodeMap = new Map<string, GraphNode>();
  const edgeMap = new Map<string, GraphEdge>();

  for (const tx of transactions) {
    // Category node
    const catKey = `cat:${tx.categoryName}`;
    if (!nodeMap.has(catKey)) {
      nodeMap.set(catKey, {
        id: catKey, label: tx.categoryName, type: "category",
        value: 0, color: colorFor(tx.categoryName), x: 0, y: 0, vx: 0, vy: 0,
      });
    }
    nodeMap.get(catKey)!.value += tx.amount;

    // Merchant/Bank node
    const merchantLabel = tx.bankName ?? tx.receiverName ?? tx.title;
    if (merchantLabel && merchantLabel.length > 0) {
      const merchKey = `merchant:${merchantLabel}`;
      if (!nodeMap.has(merchKey)) {
        nodeMap.set(merchKey, {
          id: merchKey, label: merchantLabel, type: "merchant",
          value: 0, color: "#94a3b8", x: 0, y: 0, vx: 0, vy: 0,
        });
      }
      nodeMap.get(merchKey)!.value += tx.amount;

      // Edge: category ↔ merchant
      const edgeKey = `${catKey}↔${merchKey}`;
      if (!edgeMap.has(edgeKey)) {
        edgeMap.set(edgeKey, { source: catKey, target: merchKey, weight: 0 });
      }
      edgeMap.get(edgeKey)!.weight += 1;
    }

    // Month node (for time context)
    const monthKey = `month:${tx.transactionDate.slice(0, 7)}`;
    if (!nodeMap.has(monthKey)) {
      nodeMap.set(monthKey, {
        id: monthKey, label: monthLabel(tx.transactionDate), type: "month",
        value: 0, color: "#475569", x: 0, y: 0, vx: 0, vy: 0,
      });
    }
    nodeMap.get(monthKey)!.value += tx.amount;

    // Edge: month ↔ category
    const mEdgeKey = `${monthKey}↔${catKey}`;
    if (!edgeMap.has(mEdgeKey)) {
      edgeMap.set(mEdgeKey, { source: monthKey, target: catKey, weight: 0 });
    }
    edgeMap.get(mEdgeKey)!.weight += 1;
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  };
}

/** Force-directed layout: Barnes-Hut style simplified simulation */
export function runForceSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  iterations = 120,
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const repulsion = 800;
  const attraction = 0.008;
  const damping = 0.85;

  // Initialize random positions
  for (const n of nodes) {
    n.x = centerX + (Math.random() - 0.5) * 200;
    n.y = centerY + (Math.random() - 0.5) * 200;
    n.vx = 0;
    n.vy = 0;
  }

  for (let iter = 0; iter < iterations; iter++) {
    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const src = nodes.find((n) => n.id === edge.source);
      const tgt = nodes.find((n) => n.id === edge.target);
      if (!src || !tgt) continue;
      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const force = dist * attraction * Math.log(1 + edge.weight);
      src.vx += dx * force;
      src.vy += dy * force;
      tgt.vx -= dx * force;
      tgt.vy -= dy * force;
    }

    // Center gravity + bounds
    for (const n of nodes) {
      n.vx += (centerX - n.x) * 0.001;
      n.vy += (centerY - n.y) * 0.001;
      n.vx *= damping;
      n.vy *= damping;
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(40, Math.min(width - 40, n.x));
      n.y = Math.max(40, Math.min(height - 40, n.y));
    }
  }
}

/** Node radius based on value (log scale for readability) */
export function nodeRadius(value: number, maxValue: number): number {
  if (maxValue === 0) return 12;
  const ratio = value / maxValue;
  return 8 + ratio * 24;
}
