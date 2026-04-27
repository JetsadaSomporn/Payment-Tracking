"use client";

import Link from "next/link";
import {
  ChangeEvent,
  Dispatch,
  FormEvent,
  ReactNode,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  FileCheck2,
  FileDown,
  Home,
  LockKeyhole,
  LogIn,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  ReceiptText,
  ScanLine,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UploadCloud,
  WalletCards,
} from "lucide-react";
import { formatTHB, parseAmount, todayBangkokDate } from "@/lib/money";
import { summarizeToday } from "@/lib/summary";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import type { SlipExtractionResult, Transaction } from "@/lib/types";
import { SpendingChart } from "./SpendingChart";
import { useAuth } from "@/providers/auth-provider";
import GraphView from "@/components/views/graph-view";
import OverviewView from "@/components/views/overview-view";
import TimelineView from "@/components/views/timeline-view";
import UploadView from "@/components/views/upload-view";

export type PaymentTrackerView =
  | "dashboard"
  | "graph"
  | "upload"
  | "transactions"
  | "insights"
  | "settings";

const categories = [
  "อาหาร", "เดินทาง", "ช้อปปิ้ง", "บิล/บริการ", "สุขภาพ",
  "งาน/ธุรกิจ", "ครอบครัว", "บันเทิง", "การศึกษา", "รายได้", "โอนเงิน", "อื่น ๆ",
];

const categoryColor = new Map<string, string>([
  ["อาหาร", "#111827"],
  ["เดินทาง", "#2563EB"],
  ["ช้อปปิ้ง", "#475569"],
  ["บิล/บริการ", "#0F172A"],
  ["สุขภาพ", "#64748B"],
  ["งาน/ธุรกิจ", "#334155"],
  ["ครอบครัว", "#1E40AF"],
  ["บันเทิง", "#6B7280"],
  ["การศึกษา", "#1D4ED8"],
  ["รายได้", "#111827"],
  ["โอนเงิน", "#94A3B8"],
  ["อื่น ๆ", "#9CA3AF"],
]);

const navItems: Array<{
  href: string;
  label: string;
  view: PaymentTrackerView;
  icon: ReactNode;
}> = [
  { href: "/app", label: "Today", view: "dashboard", icon: <Home size={16} strokeWidth={2} /> },
  { href: "/graph", label: "Graph", view: "graph", icon: <Share2 size={16} strokeWidth={2} /> },
  { href: "/upload", label: "Upload", view: "upload", icon: <UploadCloud size={16} strokeWidth={2} /> },
  { href: "/transactions", label: "Timeline", view: "transactions", icon: <ReceiptText size={16} strokeWidth={2} /> },
  { href: "/insights", label: "Insights", view: "insights", icon: <Sparkles size={16} strokeWidth={2} /> },
  { href: "/settings", label: "Settings", view: "settings", icon: <Settings size={16} strokeWidth={2} /> },
];

const initialTransactions: Transaction[] = [];
const localTransactionsKey = "payment-tracker.transactions.v1";

type DraftTransaction = {
  type: "income" | "expense" | "transfer";
  amount: string; fee: string; title: string;
  categoryName: string; transactionDate: string; transactionTime: string;
};

type PeriodKey = "day" | "week" | "month";

export function PaymentTrackerApp({ initialView = "dashboard" }: { initialView?: PaymentTrackerView }) {
  const {
    user,
    isAuthenticated,
    isLoading: isLoadingAuth,
    authLabel,
    userMeta,
  } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [extractedSlip, setExtractedSlip] = useState<SlipExtractionResult | null>(null);
  const [draft, setDraft] = useState<DraftTransaction>(emptyDraft());
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const today = todayBangkokDate();
  const todayTx = transactions.filter((t) => t.transactionDate === today);
  const summary = useMemo(() => summarizeToday(todayTx), [todayTx]);
  const periodSummary = useMemo(() => buildPeriodSummary(transactions), [transactions]);
  const catTotals = useMemo(() => categoryTotals(todayTx), [todayTx]);
  const hasSupabase = Boolean(getBrowserSupabaseClient());

  const loadTransactions = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch("/api/transactions", {
        method: "GET",
        headers: await authHeaders(),
      });
      const data = (await res.json()) as {
        ok: boolean;
        transactions?: Transaction[];
        error?: string;
      };

      if (!res.ok || !data.ok || !data.transactions) {
        setMessage(data.error ?? "โหลดรายการไม่สำเร็จ");
        setTransactions([]);
        return;
      }

      setTransactions(readStoredTransactions(data.transactions));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "โหลดรายการไม่สำเร็จ";
      setMessage(errorMessage);
      setTransactions([]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadTransactions();
    } else if (!isLoadingAuth) {
      setTransactions([]);
    }
  }, [isAuthenticated, isLoadingAuth, loadTransactions]);

  async function handleGoogleLogin() {
    console.log("[oauth-login] clicked");
    try {
      const supabase = getBrowserSupabaseClient();
      console.log("[oauth-login] client initialized:", !!supabase);
      
      if (!supabase) {
        console.error("[oauth-login] error: supabase client is null");
        setMessage("ไม่สามารถเชื่อมต่อกับ Supabase ได้");
        return;
      }

      const redirectTo = window.location.origin + "/auth/callback";
      console.log("[oauth-login] redirectTo:", redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: false,
        },
      });

      console.log("[oauth-login] result:", { 
        hasData: !!data, 
        url: data?.url,
        error: error?.message 
      });

      if (error) {
        setMessage("Login error: " + error.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "unknown error";
      console.error("[oauth-login] catch block error:", msg);
      setMessage("Login failed: " + msg);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setExtractedSlip(null);
    setMessage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  async function processSlip() {
    if (!selectedFile) { setMessage("เลือกไฟล์สลิปก่อน"); return; }
    setIsProcessing(true);
    setMessage(null);
    try {
      setMessage("กำลังเตรียมรูปภาพและส่งให้ AI...");

      // ── Client-side Image Optimization ──────────────────────────────────
      // Reduce image size to ~1000px height for faster upload & OCR
      const optimizedFile = await resizeImage(selectedFile, 1000);
      
      const body = new FormData();
      body.set("file", optimizedFile);
      
      const res = await fetch("/api/slips/process", { method: "POST", headers: await authHeaders(), body });
      const data = (await res.json()) as { ok: boolean; error?: string; slip?: SlipExtractionResult };
      
      if (!res.ok || !data.ok || !data.slip) { 
        setMessage(data.error ?? "อ่านสลิปไม่สำเร็จ"); 
        return; 
      }
      
      setExtractedSlip(data.slip);
      setDraft({
        type: "expense",
        amount: String(data.slip.amount ?? ""),
        fee: String(data.slip.fee ?? 0),
        title: data.slip.receiverName ? `ค่าบริการ ${data.slip.receiverName}` : "",
        categoryName: "บิล/บริการ",
        transactionDate: data.slip.transactionDateIso ?? today,
        transactionTime: data.slip.transactionTime ?? "",
      });
      setMessage(
        data.slip.confidence < 0.75
          ? "ยังอ่านสลิปได้ไม่ชัด — กรุณาตรวจสอบและกรอกเพิ่ม"
          : "อ่านสลิปสำเร็จ — ตรวจสอบความถูกต้องก่อนบันทึก",
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "อ่านสลิปไม่สำเร็จ";
      setMessage(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }

/**
 * Helper to resize image on client side for performance
 */
async function resizeImage(file: File, maxDim: number): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      let { width, height } = img;
      if (width > height) {
        if (width > maxDim) { height *= maxDim / width; width = maxDim; }
      } else {
        if (height > maxDim) { width *= maxDim / height; height = maxDim; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob || file), "image/jpeg", 0.85);
    };
    img.onerror = () => resolve(file);
  });
}

  async function saveTransaction(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!extractedSlip) { setMessage("ต้องอ่านสลิปก่อนบันทึก"); return; }
    const amount = parseAmount(draft.amount);
    const fee = parseAmount(draft.fee) ?? 0;
    if (!amount || amount <= 0) { setMessage("จำนวนเงินต้องมากกว่า 0"); return; }
    if (!draft.title.trim()) { setMessage("กรอกก่อนว่าจ่ายอะไรไป"); return; }
    if (transactions.some((t) => t.referenceNo && extractedSlip.referenceNo && t.referenceNo === extractedSlip.referenceNo)) {
      setMessage("สลิปนี้เคยบันทึกแล้ว");
      return;
    }
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ type: draft.type, amount, fee, title: draft.title.trim(), categoryName: draft.categoryName, transactionDate: draft.transactionDate, transactionTime: draft.transactionTime || null, bankName: extractedSlip.bankName, receiverName: extractedSlip.receiverName, referenceNo: extractedSlip.referenceNo }),
      });
      const data = (await res.json()) as { ok: boolean; transaction?: Transaction };
      if (!res.ok || !data.ok || !data.transaction) {
        setMessage(res.status === 409 ? "รายการนี้เคยบันทึกแล้ว" : "บันทึกไม่สำเร็จ");
        return;
      }
      setTransactions((c) => [data.transaction!, ...c]);
      setExtractedSlip(null);
      setSelectedFile(null);
      setDraft(emptyDraft());
      setMessage("บันทึกเรียบร้อย");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล";
      setMessage(errorMessage);
    }
  }

  async function deleteTransaction(txId: string) {
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/transactions?id=${encodeURIComponent(txId)}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        setMessage("ลบรายการไม่สำเร็จ");
        return;
      }
      setTransactions((c) => c.filter((t) => t.id !== txId));
      setMessage("ลบเรียบร้อย");
    } catch {
      setMessage("เกิดข้อผิดพลาดในการลบข้อมูล");
    }
  }

  const ctx: AppCtx = {
    authLabel, userMeta, user, isAuthenticated, isLoadingAuth, catTotals, draft, extractedSlip, hasSupabase, isProcessing, message,
    periodSummary, previewUrl, selectedFile, setDraft, summary, todayTx, transactions,
    handleFileChange, handleGoogleLogin, processSlip, saveTransaction, deleteTransaction,
  };

  return (
    <main className="app-canvas min-h-screen text-[var(--foreground)]">
      <div className="flex min-h-screen">
        {/* Sidebar — hidden on mobile, toggle on desktop */}
        <div
          className="hidden lg:block transition-[width,opacity] duration-200 ease-in-out overflow-hidden shrink-0"
          style={{ width: sidebarOpen ? 224 : 0, opacity: sidebarOpen ? 1 : 0 }}
        >
          <Sidebar active={initialView} ctx={ctx} />
        </div>

        <div className="min-w-0 flex-1 px-4 py-4 pb-24 sm:px-6 lg:px-10 lg:pb-5">
          <div className="mx-auto max-w-6xl">
            <TopBar
              active={initialView}
              ctx={ctx}
              message={message}
              onLogin={handleGoogleLogin}
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => setSidebarOpen((v) => !v)}
            />
            <div className="mt-4 sm:mt-6">
              {/* Mobile-only toast */}
              {message && (
                <p className="mb-3 rounded-md border border-[var(--line)] bg-[var(--soft)] px-3 py-2 text-[13px] text-[var(--muted)] sm:hidden animate-in">
                  {message}
                </p>
              )}
              {initialView === "dashboard"     && <OverviewView transactions={transactions} periodSummary={periodSummary} />}
              {initialView === "graph"         && <GraphView transactions={transactions} />}
              {initialView === "upload"        && <UploadView ctx={ctx} />}
              {initialView === "transactions"  && <TimelineView transactions={transactions} onDelete={deleteTransaction} />}
              {initialView === "insights"      && <InsightsView ctx={ctx} />}
              {initialView === "settings"      && <SettingsView ctx={ctx} />}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav active={initialView} />
    </main>
  );
}
export type AppCtx = {
  authLabel: string;
  userMeta: { full_name?: string; avatar_url?: string } | null;
  user: ReturnType<typeof useAuth>["user"];
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  catTotals: Array<{ category: string; amount: number }>;
  draft: DraftTransaction;
  extractedSlip: SlipExtractionResult | null;
  hasSupabase: boolean;
  isProcessing: boolean;
  message: string | null;
  previewUrl: string | null;
  periodSummary: Record<PeriodKey, ReturnType<typeof summarizeToday>>;
  selectedFile: File | null;
  setDraft: Dispatch<SetStateAction<DraftTransaction>>;
  summary: ReturnType<typeof summarizeToday>;
  todayTx: Transaction[];
  transactions: Transaction[];
  handleFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleGoogleLogin: () => Promise<void>;
  processSlip: () => Promise<void>;
  saveTransaction: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  deleteTransaction: (txId: string) => Promise<void>;
};
function Sidebar({ active, ctx }: { active: PaymentTrackerView; ctx: AppCtx }) {
  return (
    <aside className="sidebar-chrome sticky top-0 hidden h-screen flex-col px-3 py-5 lg:flex">
      <div className="flex items-center gap-2.5 px-2 pb-5">
        <div className="brand-mark"><WalletCards size={15} /></div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-[var(--muted)]">Personal</p>
          <p className="text-[13px] font-semibold leading-tight">Payment Tracker</p>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5">
        {navItems.map((item) => (
          <Link
            key={item.view}
            href={item.href}
            className={`nav-link ${item.view === active ? "is-active" : ""}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-3 border-t border-[var(--line)] pt-4">
        <div>
          <p className="px-2 text-[11px] font-medium uppercase tracking-widest text-[var(--muted)]">Today</p>
          <p className="font-figures mt-1 px-2 text-2xl font-medium tracking-tight">
            {formatTHB(ctx.summary.totalExpense)}
          </p>
          <p className="px-2 text-[12px] text-[var(--muted)]">
            {ctx.summary.transactionCount} items
          </p>
        </div>
        <div className="rounded-md border border-[var(--line)] bg-[var(--soft)] px-3 py-2.5">
          <p className="text-[12px] font-medium truncate">{ctx.userMeta?.full_name || ctx.authLabel}</p>
          <p className="mt-0.5 text-[11px] text-[var(--muted)]">
            {ctx.hasSupabase ? "Supabase connected" : "Local development"}
          </p>
        </div>
      </div>
    </aside>
  );
}
function TopBar({ active, ctx, message, onLogin, sidebarOpen, onToggleSidebar }: {
  active: PaymentTrackerView;
  ctx: AppCtx;
  message: string | null;
  onLogin: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const titles: Record<PaymentTrackerView, string> = {
    dashboard: "Today", graph: "Spending Graph", upload: "Upload slip",
    transactions: "Transactions", insights: "Insights", settings: "Settings",
  };

  const isAuthenticated = ctx.isAuthenticated;
  const userInitial = isAuthenticated && ctx.authLabel.includes("@") 
    ? ctx.authLabel.charAt(0).toUpperCase() 
    : "U";

  return (
    <header className="flex items-center justify-between gap-2 sm:gap-4">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Sidebar toggle — desktop only */}
        <button
          className="icon-button shrink-0 hidden lg:inline-flex"
          onClick={onToggleSidebar}
          title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          type="button"
        >
          {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
        <div>
          <Link className="text-[11px] font-medium uppercase tracking-widest text-[var(--muted)] hover:text-[var(--foreground)]" href="/">
            Payment Tracker
          </Link>
          <h2 className="font-display mt-0.5 text-xl font-semibold tracking-tight sm:text-3xl">
            {titles[active]}
          </h2>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {message && (
          <p className="hidden truncate rounded-md border border-[var(--line)] bg-[var(--soft)] px-3 py-1.5 text-[13px] text-[var(--muted)] sm:block max-w-[200px]">
            {message}
          </p>
        )}
        <button className="icon-button hidden sm:inline-flex" title="Search" type="button">
          <Search size={16} />
        </button>
        
        {ctx.isLoadingAuth ? (
          <div className="w-8 h-8 rounded-full bg-[var(--line)] animate-pulse ml-1" />
        ) : isAuthenticated ? (
          ctx.userMeta?.avatar_url ? (
            <img 
              src={ctx.userMeta.avatar_url} 
              alt={ctx.userMeta.full_name || ctx.authLabel} 
              className="w-8 h-8 rounded-full border border-[var(--line)] shadow-sm ml-1 object-cover" 
            />
          ) : (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--accent)] text-white font-semibold text-sm shadow-sm cursor-pointer ml-1">
              {userInitial}
            </div>
          )
        ) : (
          <button className="primary-button text-[13px] sm:text-sm px-2.5 sm:px-3.5" onClick={onLogin} type="button">
            <LogIn size={15} />
            <span className="hidden sm:inline">Sign in</span>
          </button>
        )}
      </div>
    </header>
  );
}

function MobileNav({ active }: { active: PaymentTrackerView }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--line)] bg-[var(--panel)]/95 backdrop-blur-xl lg:hidden safe-bottom-pb">
      <div className="flex justify-around py-1">
        {navItems.map((item) => {
          const isActive = item.view === active;
          return (
            <Link
              key={item.view}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 text-[11px] font-medium transition-colors rounded-lg ${
                isActive
                  ? "text-[var(--foreground)]"
                  : "text-[var(--muted)]"
              }`}
            >
              <div className={`flex items-center justify-center rounded-lg p-1.5 ${
                isActive ? "bg-[var(--soft)]" : ""
              }`}>
                {item.icon}
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function DashboardView({ ctx }: { ctx: AppCtx }) {
  const dateStr = new Intl.DateTimeFormat("th-TH", {
    day: "numeric", month: "long", year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date());

  return (
    <div className="grid gap-4">
      <div className="app-hero-panel animate-in overflow-hidden p-5 sm:p-7 lg:p-9">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CalendarDays size={13} className="text-[var(--muted)]" />
              <span className="text-[12px] font-medium text-[var(--muted)]">Bangkok · {dateStr}</span>
            </div>
            <div className="mt-5 flex items-start gap-1">
              <span className="app-hero-currency mt-1">฿</span>
              <span className="hero-amount">
                {ctx.summary.totalExpense.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[var(--muted)]">
              {ctx.summary.transactionCount > 0
                ? `${ctx.summary.transactionCount} รายการวันนี้ — ${ctx.summary.insight}`
                : "ยังไม่มีรายการวันนี้ อัปโหลดสลิปแรกได้เลย"}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { icon: <ArrowDownRight size={14} />, label: "Expense", value: formatTHB(ctx.summary.totalExpense) },
                { icon: <ArrowUpRight size={14} />, label: "Income",  value: formatTHB(ctx.summary.totalIncome) },
                { icon: <TrendingUp size={14} />,    label: "Net",     value: formatTHB(ctx.summary.netAmount) },
                { icon: <ReceiptText size={14} />,   label: "Items",   value: String(ctx.summary.transactionCount) },
              ].map((m, i) => (
                <div className={`metric-tile delay-${i + 1} animate-in`} key={m.label}>
                  <div className="flex items-center gap-1.5 text-[var(--muted)]">
                    {m.icon}
                    <span className="text-[11px] font-medium uppercase tracking-wider">{m.label}</span>
                  </div>
                  <p className="metric-value">{m.value}</p>
                </div>
              ))}
            </div>
            
            {/* Added Premium Line Chart for data visualization */}
            <div className="mt-8 pt-6 border-t border-[var(--line)]">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-[var(--muted)]" />
                <span className="text-[12px] font-semibold text-[var(--muted)] tracking-wider uppercase">Spending Trend</span>
              </div>
              <SpendingChart transactions={ctx.transactions} />
            </div>
          </div>
          <div className="action-dock xl:flex-col">
            <Link className="dock-action is-primary" href="/upload">
              <UploadCloud size={15} />
              Upload
            </Link>
            <Link className="dock-action" href="/transactions">
              <ReceiptText size={15} />
              Ledger
            </Link>
            <Link className="dock-action" href="/insights">
              <Sparkles size={15} />
              Insights
            </Link>
          </div>
        </div>
      </div>
      <PeriodSummaryCards summaries={ctx.periodSummary} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_380px]">
        <div className="surface animate-in delay-2 p-5 sm:p-6">
          <SectionHead icon={<ReceiptText size={16} />} title="Recent transactions" href="/transactions" linkLabel="View all" />
          <TxList transactions={ctx.todayTx} ctx={ctx} compact />
        </div>
        <div className="surface animate-in delay-3 p-5 sm:p-6">
          <SectionHead icon={<Sparkles size={16} />} title="Daily brief" />
          <p className="mt-4 text-[14px] leading-relaxed text-[var(--muted)]">
            {ctx.summary.insight}
          </p>
          {ctx.catTotals.length > 0 && (
            <div className="mt-5 space-y-3">
              {ctx.catTotals.slice(0, 4).map((item) => (
                <CatBar key={item.category} label={item.category} amount={item.amount} max={ctx.summary.totalExpense || 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionsView({ ctx }: { ctx: AppCtx }) {
  const [category, setCategory] = useState<string | "all">("all");
  const [period, setPeriod] = useState<PeriodKey | "all">("month");
  const filteredTransactions = useMemo(
    () =>
      ctx.transactions.filter((tx) => {
        const matchCategory = category === "all" || tx.categoryName === category;
        const matchPeriod = period === "all" || isInPeriod(tx.transactionDate, period);
        return matchCategory && matchPeriod;
      }),
    [category, ctx.transactions, period],
  );

  return (
    <div className="grid gap-4">
      <PeriodSummaryCards summaries={ctx.periodSummary} />
      <div className="surface flex flex-wrap items-center gap-2 p-3">
        <div className="flex min-w-52 flex-1 items-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-[13px] text-[var(--muted)]">
          <Search size={14} />
          <span>ค้นหารายการ ร้านค้า เลขอ้างอิง</span>
        </div>
        <select className="field w-auto" onChange={(e) => setCategory(e.target.value)} value={category}>
          <option value="all">ทุกหมวด</option>
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="field w-auto" onChange={(e) => setPeriod(e.target.value as PeriodKey | "all")} value={period}>
          <option value="all">ทั้งหมด</option>
          <option value="day">วันนี้</option>
          <option value="week">สัปดาห์นี้</option>
          <option value="month">เดือนนี้</option>
        </select>
        <button className="secondary-button" type="button"><FileDown size={14} />Export</button>
      </div>

      <div className="surface p-5 sm:p-6">
        <SectionHead icon={<ReceiptText size={16} />} title="Ledger" linkLabel={`${filteredTransactions.length} items`} />
        <TxList transactions={filteredTransactions} ctx={ctx} />
      </div>
    </div>
  );
}
function InsightsView({ ctx }: { ctx: AppCtx }) {
  return (
    <section className="grid gap-4">
      <PeriodSummaryCards summaries={ctx.periodSummary} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="surface p-5 sm:p-6">
        <SectionHead icon={<PieChart size={16} />} title="Category breakdown" />
        <div className="mt-5 space-y-4">
          {ctx.catTotals.length > 0
            ? ctx.catTotals.map((item) => (
                <CatBar key={item.category} label={item.category} amount={item.amount} max={ctx.summary.totalExpense || 1} />
              ))
            : <p className="text-[13px] text-[var(--muted)]">ยังไม่มีรายจ่ายวันนี้</p>}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="surface p-5 sm:p-6">
          <SectionHead icon={<Sparkles size={16} />} title="AI review" />
          <p className="mt-4 text-[14px] leading-relaxed text-[var(--muted)]">{ctx.summary.insight}</p>
          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--soft)] p-3.5">
            <p className="text-[12px] font-medium uppercase tracking-wider text-[var(--muted)]">Summary mode</p>
            <p className="mt-1 text-[13px]">Local summary from confirmed transactions only</p>
          </div>
        </div>
        <div className="surface p-5 sm:p-6">
          <SectionHead icon={<MessageSquareText size={16} />} title="Money chat" />
          <div className="mt-4 space-y-2">
            {["วันนี้ใช้ไปเท่าไหร่?", "เดือนนี้หมดกับอะไรเยอะสุด?", "ร้านไหนจ่ายบ่อยสุด?"].map((q) => (
              <button className="prompt-button" key={q} type="button">
                <span>{q}</span>
                <ChevronRight size={14} className="text-[var(--muted)]" />
              </button>
            ))}
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
function SettingsView({ ctx }: { ctx: AppCtx }) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="surface p-5 sm:p-6">
        <SectionHead icon={<LockKeyhole size={16} />} title="Account & auth" />
        <StatusRows items={[
          ["Session", ctx.authLabel],
          ["Supabase", ctx.hasSupabase ? "Configured" : "Not configured"],
        ]} />
      </div>
      <div className="surface p-5 sm:p-6">
        <SectionHead icon={<ShieldCheck size={16} />} title="Security controls" />
        <StatusRows items={[
          ["RLS", "All tables enabled"],
          ["Storage", "Private slips bucket"],
          ["Upload", "MIME + magic bytes verified"],
          ["CSP", "Nonce-based, strict-dynamic"],
        ]} />
      </div>
      <div className="surface p-5 sm:p-6">
        <SectionHead icon={<WalletCards size={16} />} title="Ledger preferences" />
        <StatusRows items={[
          ["Currency", "Thai baht"],
          ["Save behavior", "Confirm before save"],
          ["Browser cache", "Disabled for financial data"],
        ]} />
      </div>
      <div className="surface p-5 sm:p-6">
        <SectionHead icon={<Sparkles size={16} />} title="Interface" />
        <StatusRows items={[
          ["Font", "SF stack + Noto Sans Thai"],
          ["Tone", "Minimal product UI"],
          ["Theme", "Light app canvas"],
        ]} />
      </div>
    </section>
  );
}

function SectionHead({ icon, title, href, linkLabel }: { icon: ReactNode; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-[var(--muted)]">{icon}</span>
        <h3 className="text-[15px] font-semibold">{title}</h3>
      </div>
      {href && linkLabel && (
        <Link href={href} className="text-[12px] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
          {linkLabel} →
        </Link>
      )}
      {!href && linkLabel && (
        <span className="text-[12px] text-[var(--muted)]">{linkLabel}</span>
      )}
    </div>
  );
}

function PeriodSummaryCards({ summaries }: { summaries: Record<PeriodKey, ReturnType<typeof summarizeToday>> }) {
  const items: Array<{
    key: PeriodKey;
    label: string;
    caption: string;
  }> = [
    { key: "day", label: "Today", caption: "รายวัน" },
    { key: "week", label: "This week", caption: "รายสัปดาห์" },
    { key: "month", label: "This month", caption: "รายเดือน" },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((item) => {
        const summary = summaries[item.key];
        return (
          <div className="period-card animate-in" key={item.key}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  {item.label}
                </p>
                <p className="mt-1 text-[13px] text-[var(--muted)]">{item.caption}</p>
              </div>
              <CircleDollarSign size={18} className="text-[var(--muted)]" />
            </div>
            <p className="font-figures mt-6 text-3xl font-semibold tracking-[-0.05em]">
              {formatTHB(summary.totalExpense)}
            </p>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-3 text-[12px] text-[var(--muted)]">
              <span>{summary.transactionCount} items</span>
              <span>{summary.topCategory ?? "No category"}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TxList({ transactions, ctx, compact = false }: { transactions: Transaction[]; ctx?: AppCtx; compact?: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (transactions.length === 0) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-[var(--line)] bg-[var(--soft)] p-5">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-md bg-[var(--panel)] text-[var(--muted)]">
            <ReceiptText size={16} />
          </div>
          <div>
            <p className="text-[14px] font-semibold">ยังไม่มีรายการจริงในระบบ</p>
            <p className="mt-1 max-w-md text-[13px] leading-6 text-[var(--muted)]">
              เริ่มจากอัปโหลดสลิป แล้วตรวจยอดเองก่อนบันทึก รายการที่เห็นตรงนี้จะมาจากข้อมูลที่มึงยืนยันแล้วเท่านั้น
            </p>
            {!compact && (
              <Link className="secondary-button mt-3" href="/upload">
                <UploadCloud size={14} />
                Upload slip
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {transactions.map((tx) => {
        const color = categoryColor.get(tx.categoryName) ?? "#9CA3AF";
        const isExpanded = expandedId === tx.id;
        
        // Find related transactions (Obsidian-style linked thinking)
        let relatedByCategory = 0;
        let relatedByMerchant = 0;
        if (ctx && isExpanded) {
          relatedByCategory = ctx.transactions.filter(t => t.categoryName === tx.categoryName && t.id !== tx.id).length;
          relatedByMerchant = ctx.transactions.filter(t => t.receiverName === tx.receiverName && t.id !== tx.id).length;
        }

        return (
          <div key={tx.id} className="border-b border-[var(--line)] last:border-none">
            <div 
              className={`tx-row group cursor-pointer hover:bg-[var(--soft)] px-2 -mx-2 rounded-lg border-none ${isExpanded ? 'bg-[var(--soft)]' : ''}`}
              onClick={() => setExpandedId(isExpanded ? null : tx.id)}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="cat-badge mt-1.5" style={{ background: color }} />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">{tx.title}</p>
                  <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                    {tx.categoryName}
                    {tx.transactionTime ? ` · ${tx.transactionTime}` : ""}
                    {!compact && tx.referenceNo ? ` · ${tx.referenceNo}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className="font-figures text-[14px] font-medium text-[var(--foreground)]">
                  −{formatTHB(tx.amount)}
                </p>
                {ctx?.deleteTransaction && (
                  <button
                    onClick={(e) => { e.stopPropagation(); ctx.deleteTransaction(tx.id); }}
                    className="rounded p-1 text-[var(--muted)]/0 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                    title="ลบรายการ"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                )}
              </div>
            </div>
            
            {/* Linked Relationships Panel */}
            {isExpanded && ctx && (
              <div className="animate-in mb-3 ml-7 mr-2 rounded-lg bg-[var(--panel)] border border-[var(--line)] p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} className="text-[var(--muted)]" />
                  <p className="text-[12px] font-semibold tracking-wider text-[var(--muted)] uppercase">Linked Connections</p>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-md bg-[var(--soft)] p-3 flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--muted)]">Category Network</span>
                    <span className="text-[13px] font-medium">{tx.categoryName}</span>
                    <span className="text-[12px] text-[var(--muted)] mt-1">
                      {relatedByCategory > 0 ? `${relatedByCategory} related expenses` : 'First expense in this category'}
                    </span>
                  </div>
                  
                  <div className="rounded-md bg-[var(--soft)] p-3 flex flex-col gap-1">
                    <span className="text-[11px] text-[var(--muted)]">Merchant Network</span>
                    <span className="text-[13px] font-medium truncate">{tx.receiverName || tx.title}</span>
                    <span className="text-[12px] text-[var(--muted)] mt-1">
                      {relatedByMerchant > 0 ? `${relatedByMerchant} related expenses` : 'First visit to this merchant'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CatBar({ label, amount, max }: { label: string; amount: number; max: number }) {
  const pct = Math.max(4, Math.round((amount / max) * 100));
  const color = categoryColor.get(label) ?? "var(--foreground)";

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <div className="flex items-center gap-2">
          <span className="cat-badge" style={{ background: color }} />
          <span className="font-medium">{label}</span>
        </div>
        <span className="font-figures text-[var(--muted)]">{formatTHB(amount)}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--soft)]">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[12px] font-medium text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

function SlipFacts({ slip }: { slip: SlipExtractionResult | null }) {
  if (!slip) {
    return (
      <div className="mt-5 rounded-lg border border-[var(--line)] bg-[var(--soft)] p-4 text-[13px] text-[var(--muted)]">
        อ่านสลิปก่อน แล้วข้อมูลจะปรากฏที่นี่
      </div>
    );
  }

  const rows = [
    ["จำนวนเงิน", slip.amount == null ? "อ่านไม่ได้" : formatTHB(slip.amount)],
    ["วันที่", slip.transactionDateIso ?? "—"],
    ["เวลา", slip.transactionTime ?? "—"],
    ["ธนาคาร", slip.bankName ?? "—"],
    ["ผู้รับ", slip.receiverName ?? "—"],
    ["เลขอ้างอิง", slip.referenceNo ?? "—"],
    ["ความมั่นใจ", `${Math.round(slip.confidence * 100)}%`],
  ];

  return (
    <dl className="mt-5 overflow-hidden rounded-lg border border-[var(--line)]">
      {rows.map(([k, v], i) => (
        <div
          key={k}
          className={`flex justify-between gap-3 px-3.5 py-2.5 text-[13px] ${i < rows.length - 1 ? "border-b border-[var(--line)]" : ""} ${i % 2 === 0 ? "bg-[var(--soft)]" : "bg-[var(--panel)]"}`}
        >
          <dt className="text-[var(--muted)]">{k}</dt>
          <dd className="font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function ConfWarn({ slip }: { slip: SlipExtractionResult | null }) {
  if (!slip || slip.confidence >= 0.75) return null;
  return (
    <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-[var(--bad)]/25 bg-[var(--bad)]/6 p-3.5 text-[13px] text-[var(--bad)]">
      <ShieldCheck size={14} className="mt-0.5 shrink-0" />
      ระบบไม่มั่นใจ — กรุณาตรวจยอด วันที่ และเลขอ้างอิงก่อนบันทึก
    </div>
  );
}

function StatusRows({ items }: { items: [string, string][] }) {
  return (
    <div className="mt-4">
      {items.map(([k, v]) => (
        <div className="status-row" key={k}>
          <span className="text-[var(--muted)]">{k}</span>
          <span className="font-medium">{v}</span>
        </div>
      ))}
    </div>
  );
}
async function authHeaders(): Promise<HeadersInit> {
  const csrfToken = document.cookie
    ?.split("; ")
    ?.find((r) => r.startsWith("csrf-token="))
    ?.split("=")[1];
  const headers: HeadersInit = {};
  if (csrfToken) {
    (headers as Record<string, string>)["x-csrf-token"] = csrfToken;
  }
  return headers;
}

function emptyDraft(): DraftTransaction {
  return { type: "expense", amount: "", fee: "0", title: "", categoryName: "บิล/บริการ", transactionDate: todayBangkokDate(), transactionTime: "" };
}

function categoryTotals(transactions: Transaction[]) {
  const m = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    m.set(t.categoryName, (m.get(t.categoryName) ?? 0) + t.amount + t.fee);
  }
  return [...m.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

function buildPeriodSummary(transactions: Transaction[]) {
  return {
    day: summarizeToday(transactions.filter((tx) => isInPeriod(tx.transactionDate, "day"))),
    week: summarizeToday(transactions.filter((tx) => isInPeriod(tx.transactionDate, "week"))),
    month: summarizeToday(transactions.filter((tx) => isInPeriod(tx.transactionDate, "month"))),
  };
}

function isInPeriod(isoDate: string, period: PeriodKey) {
  const today = todayBangkokDate();

  if (period === "day") {
    return isoDate === today;
  }

  if (period === "month") {
    return isoDate >= `${today.slice(0, 8)}01` && isoDate <= today;
  }

  return isoDate >= currentWeekStart(today) && isoDate <= today;
}

function currentWeekStart(todayIso: string) {
  const today = new Date(`${todayIso}T00:00:00+07:00`);
  const daysSinceMonday = (today.getDay() + 6) % 7;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - daysSinceMonday);

  return formatBangkokDate(weekStart);
}

function formatBangkokDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function readStoredTransactions(value: unknown): Transaction[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is Transaction => {
    if (!item || typeof item !== "object") return false;
    const tx = item as Partial<Transaction>;
    return (
      typeof tx.id === "string" &&
      typeof tx.amount === "number" &&
      typeof tx.fee === "number" &&
      typeof tx.title === "string" &&
      typeof tx.categoryName === "string" &&
      typeof tx.transactionDate === "string" &&
      (tx.type === "income" || tx.type === "expense" || tx.type === "transfer") &&
      tx.currency === "THB"
    );
  });
}
