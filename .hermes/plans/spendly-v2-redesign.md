# Spendly v2 Redesign — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Redesign Spendly with clean overview, Obsidian-style spending graph, intuitive timeline — same security grade A+.

**Architecture:** Split monolithic PaymentTrackerApp (1161 lines) into focused view components. Add canvas-based force-directed graph. Shared auth/data layer untouched.

**Tech Stack:** Next.js 16, React 19, Supabase, Tailwind CSS, Canvas API (no D3 dependency)

---

## Phase 1: Refactor — Split Views

### Task 1.1: Extract shared types and hooks
**Objective:** Create `src/hooks/use-transactions.ts` to share data fetching logic

**Files:**
- Create: `src/hooks/use-transactions.ts`
- Modify: `src/components/payment-tracker-app.tsx`

**Implementation:**
Extract `loadTransactions`, `saveTransaction`, `processSlip`, `authHeaders`, `todayTx`, `summary`, `periodSummary`, `catTotals` into a shared hook. Keep all state in the hook, expose via return value.

### Task 1.2: Create OverviewView component
**Objective:** Clean daily spend summary card with period toggle

**Files:**
- Create: `src/components/views/overview-view.tsx`
- Modify: `src/components/payment-tracker-app.tsx`

**Design:**
- Single hero card showing: today's total spend, income, net, item count
- Period toggle: Day | Week | Month (radio-style pills)
- Compact trend sparkline (CSS-only bar chart from period data)
- Quick-add button for manual entry
- Recent transactions list (last 5)

### Task 1.3: Create GraphView component
**Objective:** Force-directed node graph showing spending connections

**Files:**
- Create: `src/components/views/graph-view.tsx`
- Create: `src/lib/graph-layout.ts` (force-directed layout engine)

**Design:**
- Canvas-based rendering (performance for 100+ nodes)
- Nodes: Categories (colored by type), Banks, Merchants, Months
- Node radius: proportional to total spending
- Edges: connect categories to transactions
- Force simulation: charge repulsion, link attraction, center gravity
- Interaction: drag nodes, click → filter, hover → tooltip
- Legend at bottom
- Period filter above graph

**Graph Layout Engine:**
```typescript
// src/lib/graph-layout.ts
type GraphNode = { id: string; label: string; type: 'category' | 'merchant' | 'bank' | 'month'; value: number; color: string; x: number; y: number; vx: number; vy: number };
type GraphEdge = { source: string; target: string; weight: number };
// Force simulation: 100 iterations, charge=-300, link distance=60
```

### Task 1.4: Create TimelineView component
**Objective:** Chronological scrolling feed with period filters

**Files:**
- Create: `src/components/views/timeline-view.tsx`

**Design:**
- Period filter: Day | Week | Month | All (pill buttons)
- Group transactions by date headers ("วันนี้", "เมื่อวาน", "27 เม.ย. 2023")
- Each item: category icon, title, amount (red/green), bank, time
- Infinite scroll (load more button for now)
- Search bar at top
- Export button

### Task 1.5: Refactor UploadView and SettingsView
**Objective:** Extract existing upload/settings into separate files

**Files:**
- Create: `src/components/views/upload-view.tsx`
- Create: `src/components/views/settings-view.tsx`

Keep existing functionality, just extract from monolithic component.

### Task 1.6: Refactor PaymentTrackerApp to use new views
**Objective:** Slim down PaymentTrackerApp to just layout + routing

**Files:**
- Modify: `src/components/payment-tracker-app.tsx`

Reduce to: sidebar nav + `<ViewSelector active={initialView} ctx={ctx} />` + mobile nav. All view logic in separate components.

---

## Phase 2: Add Graph Data API

### Task 2.1: Create /api/graph endpoint
**Objective:** Return graph nodes/edges from transactions

**Files:**
- Create: `src/app/api/graph/route.ts`

**Implementation:**
```typescript
// GET /api/graph?period=month
// Returns: { nodes: GraphNode[], edges: GraphEdge[] }
// Groups transactions by category, merchant, bank → builds adjacency
// Same security: sameOrigin + CSRF + rateLimit + requireAuth
```

### Task 2.2: Add graph data types
**Objective:** Define GraphNode/GraphEdge in types.ts

**Files:**
- Modify: `src/lib/types.ts`

---

## Phase 3: Navigation & Polish

### Task 3.1: Add Graph to sidebar navigation
**Objective:** Add "Graph" nav item with Share2 icon

**Files:**
- Modify: `src/components/payment-tracker-app.tsx`

### Task 3.2: Create /graph page route
**Objective:** New route for graph view

**Files:**
- Create: `src/app/graph/page.tsx`

### Task 3.3: Add period toggle to all views
**Objective:** Consistent Day/Week/Month filter bar across views

**Files:**
- Create: `src/components/period-toggle.tsx`

---

## Phase 4: Security Verification

### Task 4.1: Verify all API routes have security checks
**Objective:** Ensure new /api/graph has same security as existing routes

**Checklist:**
- [ ] `requireSameOrigin(request)` ✓
- [ ] `requireCsrfToken(request)` ✓
- [ ] `checkRateLimit(request, ...)` ✓
- [ ] `requireAuthenticatedUser(request)` ✓
- [ ] No plaintext sensitive data exposed ✓

---

## Verification

After all tasks:
1. `npm run build` passes
2. All pages load: /app, /graph, /upload, /transactions, /settings, /insights
3. Graph shows spending nodes and connections
4. Period toggle works across all views
5. Save transaction still works (encrypted fields)
6. Session persists across all pages (no regression)
7. Mobile responsive (sidebar collapses, bottom nav)
