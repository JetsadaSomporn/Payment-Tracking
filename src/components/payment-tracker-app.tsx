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
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  FileDown,
  Home,
  Loader2,
  LogIn,
  LogOut,
  MessageSquareText,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  ReceiptText,
  Search,
  Send,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Sun,
  UploadCloud,
  WalletCards,
} from "lucide-react";
import { formatTHB, parseAmount, todayBangkokDate } from "@/lib/money";
import { summarizeToday } from "@/lib/summary";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import type { SlipExtractionResult, Transaction } from "@/lib/types";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
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
  ["อาหาร", "#D4A853"],
  ["เดินทาง", "#60A5FA"],
  ["ช้อปปิ้ง", "#A78BFA"],
  ["บิล/บริการ", "#FB923C"],
  ["สุขภาพ", "#34D399"],
  ["งาน/ธุรกิจ", "#22D3EE"],
  ["ครอบครัว", "#F472B6"],
  ["บันเทิง", "#818CF8"],
  ["การศึกษา", "#2DD4BF"],
  ["รายได้", "#34D399"],
  ["โอนเงิน", "#94A3B8"],
  ["อื่น ๆ", "#71717A"],
]);

const navItems: Array<{
  href: string;
  label: string;
  view: PaymentTrackerView;
  icon: ReactNode;
}> = [
  { href: "/m", label: "Today", view: "dashboard", icon: <Home size={16} strokeWidth={2} /> },
  { href: "/g", label: "Graph", view: "graph", icon: <Share2 size={16} strokeWidth={2} /> },
  { href: "/a", label: "Upload", view: "upload", icon: <UploadCloud size={16} strokeWidth={2} /> },
  { href: "/t", label: "Timeline", view: "transactions", icon: <ReceiptText size={16} strokeWidth={2} /> },
  { href: "/i", label: "Insights", view: "insights", icon: <Sparkles size={16} strokeWidth={2} /> },
  { href: "/s", label: "Settings", view: "settings", icon: <Settings size={16} strokeWidth={2} /> },
];

const initialTransactions: Transaction[] = [];
const localTransactionsKey = "payment-tracker.transactions.v1";

type DraftTransaction = {
  type: "income" | "expense" | "transfer";
  amount: string; fee: string; title: string;
  categoryName: string; transactionDate: string; transactionTime: string;
};

type PeriodKey = "day" | "week" | "month" | "all";

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
  const { addToast } = useToast();
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
        addToast({ type: "error", message: data.error ?? "โหลดรายการไม่สำเร็จ" });
        setTransactions([]);
        return;
      }

      setTransactions(readStoredTransactions(data.transactions));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "โหลดรายการไม่สำเร็จ";
      addToast({ type: "error", message: errorMessage });
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
        addToast({ type: "error", message: "ไม่สามารถเชื่อมต่อกับ Supabase ได้" });
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
        addToast({ type: "error", message: "Login error: " + error.message });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "unknown error";
      console.error("[oauth-login] catch block error:", msg);
      addToast({ type: "error", message: "Login failed: " + msg });
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setExtractedSlip(null);
    ;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  async function processSlip() {
    if (!selectedFile) { addToast({ type: "warning", message: "เลือกไฟล์สลิปก่อน" }); return; }
    setIsProcessing(true);
    ;
    try {
      addToast({ type: "info", message: "กำลังเตรียมรูปภาพและส่งให้ AI..." });

      // ── Client-side Image Optimization ──────────────────────────────────
      // Reduce image size to ~1000px height for faster upload & OCR
      const optimizedFile = await resizeImage(selectedFile, 1000);
      
      const body = new FormData();
      body.set("file", optimizedFile);
      
      const res = await fetch("/api/slips/process", { method: "POST", headers: await authHeaders(), body });
      const data = (await res.json()) as { ok: boolean; error?: string; slip?: SlipExtractionResult };
      
      if (!res.ok || !data.ok || !data.slip) { 
        addToast({ type: "error", message: data.error ?? "อ่านสลิปไม่สำเร็จ" }); 
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
      addToast({ type: data.slip.confidence < 0.75 ? "warning" : "success", message: data.slip.confidence < 0.75 ? "ยังอ่านสลิปได้ไม่ชัด — กรุณาตรวจสอบและกรอกเพิ่ม" : "อ่านสลิปสำเร็จ — ตรวจสอบความถูกต้องก่อนบันทึก" });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "อ่านสลิปไม่สำเร็จ";
      addToast({ type: "error", message: errorMessage });
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
    if (!extractedSlip) { addToast({ type: "warning", message: "ต้องอ่านสลิปก่อนบันทึก" }); return; }
    const amount = parseAmount(draft.amount);
    const fee = parseAmount(draft.fee) ?? 0;
    if (!amount || amount <= 0) { addToast({ type: "warning", message: "จำนวนเงินต้องมากกว่า 0" }); return; }
    if (!draft.title.trim()) { addToast({ type: "warning", message: "กรอกก่อนว่าจ่ายอะไรไป" }); return; }
    if (transactions.some((t) => t.referenceNo && extractedSlip.referenceNo && t.referenceNo === extractedSlip.referenceNo)) {
      addToast({ type: "warning", message: "สลิปนี้เคยบันทึกแล้ว" });
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
        addToast({ type: "error", message: res.status === 409 ? "รายการนี้เคยบันทึกแล้ว" : "บันทึกไม่สำเร็จ" });
        return;
      }
      setTransactions((c) => [data.transaction!, ...c]);
      setExtractedSlip(null);
      setSelectedFile(null);
      setDraft(emptyDraft());
      addToast({ type: "success", message: "บันทึกเรียบร้อย", title: "สำเร็จ" });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล";
      addToast({ type: "error", message: errorMessage });
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
        addToast({ type: "error", message: "ลบรายการไม่สำเร็จ" });
        return;
      }
      setTransactions((c) => c.filter((t) => t.id !== txId));
      addToast({ type: "success", message: "ลบเรียบร้อย", title: "สำเร็จ" });
    } catch {
      addToast({ type: "error", message: "เกิดข้อผิดพลาดในการลบข้อมูล" });
    }
  }

  const ctx: AppCtx = {
    authLabel, userMeta, user, isAuthenticated, isLoadingAuth, catTotals, draft, extractedSlip, hasSupabase, isProcessing,
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

        <div className="min-w-0 flex-1 px-5 py-5 pb-28 sm:px-8 lg:px-12 lg:pb-8">
          <div className="mx-auto max-w-5xl">
            <TopBar
              active={initialView}
              ctx={ctx}
              onLogin={handleGoogleLogin}
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => setSidebarOpen((v) => !v)}
            />
            <div className="mt-6 sm:mt-8">
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
    <aside className="sidebar-chrome sticky top-0 hidden h-screen flex-col px-3 py-6 lg:flex">
      <div className="flex items-center gap-3 px-3 pb-6">
        <div className="brand-mark"><WalletCards size={15} /></div>
        <div>
          <p className="font-display text-[15px] font-semibold tracking-tight">Spendly</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 tracking-wide">Finance Tracker</p>
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
      <div className="mt-auto flex flex-col gap-3 border-t border-[var(--line)] pt-5">
        <div className="rounded-xl bg-[var(--soft)] px-3.5 py-3">
          <p className="text-[11px] font-medium text-[var(--muted)] truncate">{ctx.userMeta?.full_name || ctx.authLabel}</p>
          <p className="mt-0.5 text-[11px] text-[var(--text-disabled)]">
            {ctx.hasSupabase ? "Cloud sync on" : "Local mode"}
          </p>
        </div>
      </div>
    </aside>
  );
}
function TopBar({ active, ctx, onLogin, sidebarOpen, onToggleSidebar }: {
  active: PaymentTrackerView;
  ctx: AppCtx;
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
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button
          className="icon-button shrink-0 hidden lg:inline-flex"
          onClick={onToggleSidebar}
          title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          type="button"
        >
          {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
        <div>
          <Link className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors" href="/">
            Spendly
          </Link>
          <h2 className="font-display mt-0.5 text-2xl font-semibold tracking-tight sm:text-3xl">
            {titles[active]}
          </h2>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {ctx.isLoadingAuth ? (
          <div className="w-9 h-9 rounded-full bg-[var(--line)] animate-pulse" />
        ) : isAuthenticated ? (
          ctx.userMeta?.avatar_url ? (
            <img 
              src={ctx.userMeta.avatar_url} 
              alt={ctx.userMeta.full_name || ctx.authLabel} 
              className="w-9 h-9 rounded-full border border-[var(--line)] shadow-sm object-cover" 
            />
          ) : (
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--accent)] text-[#0A0A0C] font-semibold text-sm shadow-sm cursor-pointer">
              {userInitial}
            </div>
          )
        ) : (
          <button className="primary-button text-[13px] sm:text-sm px-3 sm:px-4" onClick={onLogin} type="button">
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
    <nav className="fixed inset-x-0 bottom-0 z-[100] w-full border-t border-[var(--line)] bg-[var(--panel)] lg:hidden" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}>
      <div className="flex justify-around py-1.5">
        {navItems.map((item) => {
          const isActive = item.view === active;
          return (
            <Link
              key={item.view}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-2 py-1.5 text-[11px] font-medium transition-colors rounded-xl ${
                isActive
                  ? "text-[var(--foreground)]"
                  : "text-[var(--muted)]"
              }`}
            >
              <div className={`flex items-center justify-center rounded-lg p-1.5 ${
                isActive ? "bg-[var(--soft)] text-[var(--gold)]" : ""
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
    <div className="grid gap-5">
      <PeriodSummaryCards summaries={ctx.periodSummary} />
      <div className="surface flex flex-wrap items-center gap-2.5 p-3.5">
        <div className="flex min-w-52 flex-1 items-center gap-2.5 rounded-lg border border-[var(--line)] bg-[var(--bg-base)] px-3.5 py-2.5 text-[13px] text-[var(--muted)]">
          <Search size={15} />
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

      <div className="surface p-6 sm:p-7">
        <SectionHead icon={<ReceiptText size={16} />} title="Ledger" linkLabel={`${filteredTransactions.length} items`} />
        <TxList transactions={filteredTransactions} ctx={ctx} />
      </div>
    </div>
  );
}
const SUGGEST_CHIPS = [
  "เยอะเกินไปไหม?",
  "หมวดไหนน่าลด?",
  "เดือนหน้าควรทำยังไง?",
  "ออมเพิ่มได้ไหม?",
];

function InsightsView({ ctx }: { ctx: AppCtx }) {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [activeQ, setActiveQ] = useState<string | null>(null);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";
  const monthlyTx = useMemo(
    () => ctx.transactions.filter(t => t.transactionDate >= monthStart && t.transactionDate <= today),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ctx.transactions, monthStart],
  );
  const monthExpense = useMemo(
    () => monthlyTx.filter(t => t.type === "expense").reduce((s, t) => s + t.amount + t.fee, 0),
    [monthlyTx],
  );
  const monthCatTotals = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of monthlyTx) {
      if (t.type !== "expense") continue;
      m.set(t.categoryName, (m.get(t.categoryName) ?? 0) + t.amount + t.fee);
    }
    return [...m.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
  }, [monthlyTx]);

  const monthLabel = new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric", timeZone: "Asia/Bangkok" }).format(new Date());

  async function requestInsight(question?: string) {
    if (!ctx.isAuthenticated) { setInsightError("กรุณาเข้าสู่ระบบก่อน"); return; }
    if (ctx.transactions.length === 0) { setInsightError("ยังไม่มีข้อมูลรายการ"); return; }
    const key = question ?? "__general__";
    setActiveQ(key);
    setInsightError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(buildInsightContext(monthlyTx, monthLabel, question)),
      });
      const data = await res.json() as { ok: boolean; insight?: string; error?: string };
      if (!res.ok || !data.ok || !data.insight) {
        setInsightError(data.error ?? "วิเคราะห์ไม่สำเร็จ");
      } else {
        setAiInsight(data.insight);
        setInputValue("");
      }
    } catch {
      setInsightError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setActiveQ(null);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = inputValue.trim();
    if (q) requestInsight(q);
  }

  const isLoading = activeQ !== null;

  return (
    <section className="grid gap-5">
      <PeriodSummaryCards summaries={ctx.periodSummary} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">

        {/* ── Monthly category breakdown ── */}
        <div className="surface p-6 sm:p-7">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[15px] font-semibold">หมวดหมู่{monthLabel ? ` · ${monthLabel}` : ""}</h3>
            <span className="font-figures text-[13px] text-[var(--text-muted)]">
              ฿{monthExpense.toLocaleString("th-TH", { minimumFractionDigits: 0 })}
            </span>
          </div>
          <div className="space-y-4">
            {monthCatTotals.length > 0
              ? monthCatTotals.map((item) => (
                  <CatBar key={item.category} label={item.category} amount={item.amount} max={monthExpense || 1} />
                ))
              : <p className="text-[14px] text-[var(--text-muted)]">ยังไม่มีรายจ่ายเดือนนี้</p>}
          </div>
        </div>

        {/* ── Analysis panel ── */}
        <div className="surface p-6 sm:p-7 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold">วิเคราะห์เดือนนี้</h3>
              <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                {monthlyTx.length} รายการ · ใช้ไป ฿{monthExpense.toLocaleString("th-TH", { minimumFractionDigits: 0 })}
              </p>
            </div>
            <button
              className="secondary-button text-[12px] gap-1.5 shrink-0"
              onClick={() => requestInsight()}
              disabled={isLoading || !ctx.isAuthenticated}
              type="button"
            >
              {activeQ === "__general__" && <Loader2 size={12} className="animate-spin" />}
              {activeQ === "__general__" ? "กำลังวิเคราะห์..." : "สรุปภาพรวม"}
            </button>
          </div>

          {/* Response */}
          {(aiInsight || insightError) && (
            <div className={`rounded-xl p-4 text-[14px] leading-[1.7] animate-in ${
              insightError
                ? "bg-[var(--expense-soft)] text-[var(--expense)]"
                : "bg-[var(--bg-base)] text-[var(--text-secondary)]"
            }`}>
              {aiInsight ?? insightError}
            </div>
          )}

          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-2">
            {SUGGEST_CHIPS.map(q => (
              <button
                key={q}
                type="button"
                disabled={isLoading}
                onClick={() => requestInsight(q)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-base)] px-3 py-1.5 text-[12px] text-[var(--text-muted)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-secondary)] disabled:opacity-40"
              >
                {activeQ === q && <Loader2 size={10} className="animate-spin shrink-0" />}
                {q}
              </button>
            ))}
          </div>

          {/* Freeform input */}
          <form onSubmit={handleSubmit} className="flex gap-2 mt-auto pt-1">
            <input
              className="field text-[14px] flex-1 min-w-0"
              placeholder="ถามอะไรก็ได้..."
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim() || !ctx.isAuthenticated}
              className="secondary-button px-3 shrink-0 disabled:opacity-40"
            >
              {isLoading && activeQ === inputValue.trim()
                ? <Loader2 size={14} className="animate-spin" />
                : <Send size={14} />}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function buildInsightContext(transactions: Transaction[], period: string, question?: string) {
  const expenses = transactions.filter(t => t.type === "expense");
  const income = transactions.filter(t => t.type === "income");
  const totalExpense = expenses.reduce((s, t) => s + t.amount + t.fee, 0);
  const totalIncome = income.reduce((s, t) => s + t.amount, 0);
  const catMap = new Map<string, { amount: number; count: number }>();
  for (const t of expenses) {
    const cur = catMap.get(t.categoryName) ?? { amount: 0, count: 0 };
    catMap.set(t.categoryName, { amount: cur.amount + t.amount + t.fee, count: cur.count + 1 });
  }
  const categories = [...catMap.entries()]
    .map(([name, { amount, count }]) => ({ name, amount, count }))
    .sort((a, b) => b.amount - a.amount);
  return { totalExpense, totalIncome, transactionCount: transactions.length, categories, period, question };
}
function SettingsView({ ctx }: { ctx: AppCtx }) {
  async function handleSignOut() {
    const supabase = getBrowserSupabaseClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.reload();
  }

  const synced = ctx.hasSupabase && ctx.isAuthenticated;

  return (
    <div className="max-w-xl space-y-6 animate-in">
      {/* ── Profile ── */}
      <div className="surface p-5 flex items-center gap-4">
        {ctx.userMeta?.avatar_url ? (
          <img
            src={ctx.userMeta.avatar_url}
            alt=""
            className="w-12 h-12 rounded-full border border-[var(--border-subtle)] object-cover shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[var(--gold)] text-[#0A0A0C] flex items-center justify-center text-lg font-bold shrink-0">
            {ctx.isAuthenticated ? (ctx.authLabel?.charAt(0)?.toUpperCase() ?? "U") : "?"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold truncate">
            {ctx.userMeta?.full_name || (ctx.isAuthenticated ? "User" : "Guest")}
          </p>
          <p className="text-[13px] text-[var(--text-muted)] truncate mt-0.5">
            {ctx.isAuthenticated ? ctx.authLabel : "ยังไม่ได้เข้าสู่ระบบ"}
          </p>
        </div>
        {ctx.isAuthenticated ? (
          <button
            className="secondary-button text-[13px] gap-2 shrink-0"
            onClick={handleSignOut}
            type="button"
          >
            <LogOut size={14} />
            Sign out
          </button>
        ) : (
          <button
            className="primary-button text-[13px] gap-2 shrink-0"
            onClick={ctx.handleGoogleLogin}
            type="button"
          >
            <LogIn size={14} />
            Sign in
          </button>
        )}
      </div>

      {/* ── System ── */}
      <div>
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">System</p>
        <div className="surface overflow-hidden divide-y divide-[var(--border-subtle)]">
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-[14px] text-[var(--text-secondary)]">Cloud sync</span>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${synced ? "bg-[var(--income)]" : "bg-[var(--text-disabled)]"}`} />
              <span className={`text-[13px] ${synced ? "text-[var(--income)]" : "text-[var(--text-muted)]"}`}>
                {synced ? "Active" : "Offline"}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-[14px] text-[var(--text-secondary)]">Currency</span>
            <span className="text-[13px] text-[var(--text-muted)]">Thai Baht (฿)</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-[14px] text-[var(--text-secondary)]">Timezone</span>
            <span className="text-[13px] text-[var(--text-muted)]">Bangkok (UTC+7)</span>
          </div>
        </div>
      </div>

      {/* ── Data ── */}
      <div>
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Data</p>
        <div className="surface overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[var(--bg-elevated)] transition-colors"
            type="button"
          >
            <div className="flex items-center gap-3">
              <FileDown size={15} className="text-[var(--text-muted)] shrink-0" />
              <span className="text-[14px]">Export transactions</span>
            </div>
            <span className="text-[12px] font-figures text-[var(--text-muted)]">CSV</span>
          </button>
        </div>
      </div>

      {/* ── Legal ── */}
      <div>
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Legal</p>
        <div className="surface overflow-hidden divide-y divide-[var(--border-subtle)]">
          <Link href="/p" className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--bg-elevated)] transition-colors">
            <span className="text-[14px] text-[var(--text-secondary)]">Privacy Policy</span>
            <ChevronRight size={14} className="text-[var(--text-muted)]" />
          </Link>
          <Link href="/e" className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--bg-elevated)] transition-colors">
            <span className="text-[14px] text-[var(--text-secondary)]">Terms of Service</span>
            <ChevronRight size={14} className="text-[var(--text-muted)]" />
          </Link>
        </div>
      </div>

      {/* ── About ── */}
      <div>
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">About</p>
        <div className="surface overflow-hidden divide-y divide-[var(--border-subtle)]">
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-[14px] text-[var(--text-secondary)]">App</span>
            <span className="text-[13px] text-[var(--text-muted)]">Spendly</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-[14px] text-[var(--text-secondary)]">Security</span>
            <div className="flex items-center gap-1.5 text-[var(--income)]">
              <ShieldCheck size={13} />
              <span className="text-[13px]">Secured</span>
            </div>
          </div>
        </div>
      </div>
    </div>
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
    <div className="grid gap-4 md:grid-cols-3">
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
            <p className="font-figures mt-5 text-[32px] font-semibold tracking-[-0.04em]">
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
  if (transactions.length === 0) {
    return (
      <div className="mt-5 rounded-xl border border-dashed border-[var(--line)] bg-[var(--soft)] p-6">
        <div className="flex items-start gap-3.5">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--panel)] text-[var(--muted)]">
            <ReceiptText size={18} />
          </div>
          <div>
            <p className="text-[15px] font-semibold">ยังไม่มีรายการ</p>
            <p className="mt-1 max-w-md text-[14px] leading-6 text-[var(--muted)]">
              เริ่มจากอัปโหลดสลิปหรือเพิ่มรายการด้วยตนเอง รายการที่บันทึกจะปรากฏที่นี่
            </p>
            {!compact && (
              <Link className="dock-action is-primary mt-4" href="/a">
                <UploadCloud size={15} />
                เพิ่มรายการ
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-0.5">
      {transactions.map((tx) => {
        const color = categoryColor.get(tx.categoryName) ?? "#71717A";
        const isIncome = tx.type === "income";
        const isTransfer = tx.type === "transfer";
        const amountPrefix = isIncome ? "+" : isTransfer ? "⇄" : "−";
        const amountColor = isIncome ? "var(--income)" : isTransfer ? "var(--text-secondary)" : "var(--text-primary)";

        return (
          <div 
            key={tx.id} 
            className="group flex items-center gap-3.5 rounded-xl px-3 py-3 transition-colors hover:bg-[var(--soft)]"
          >
            <div 
              className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" 
              style={{ background: color }} 
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium">{tx.title}</p>
              <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                {tx.categoryName}
                {tx.transactionTime ? ` · ${tx.transactionTime}` : ""}
                {!compact && tx.referenceNo ? ` · ${tx.referenceNo}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <p className="font-figures text-[14px] font-semibold" style={{ color: amountColor }}>
                {amountPrefix}{formatTHB(tx.amount + tx.fee)}
              </p>
              {ctx?.deleteTransaction && (
                <button
                  onClick={(e) => { e.stopPropagation(); ctx.deleteTransaction(tx.id); }}
                  className="rounded-lg p-1.5 text-[var(--text-disabled)] opacity-0 transition-all hover:bg-[var(--expense-soft)] hover:text-[var(--expense)] group-hover:opacity-100"
                  title="ลบรายการ"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CatBar({ label, amount, max }: { label: string; amount: number; max: number }) {
  const pct = Math.max(3, Math.round((amount / max) * 100));
  const color = categoryColor.get(label) ?? "var(--foreground)";

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-[13px]">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: color }} />
          <span className="font-medium">{label}</span>
        </div>
        <span className="font-figures text-[var(--muted)]">{formatTHB(amount)}</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--soft)]">
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: color }} />
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

function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("spendly-theme");
    const isLight = stored === "light";
    setIsDark(!isLight);
    // Re-apply the attribute on every mount — Next.js strips data-theme
    // from <html> during client-side navigation because the server-rendered
    // RSC payload never includes it.
    if (isLight) {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, []);

  function toggle() {
    const next = isDark ? "light" : "dark";
    setIsDark(!isDark);
    if (next === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem("spendly-theme", next);
  }

  return (
    <button
      className="icon-button"
      onClick={toggle}
      type="button"
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

export async function authHeaders(): Promise<HeadersInit> {
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
    day:   summarizeToday(transactions.filter((tx) => isInPeriod(tx.transactionDate, "day"))),
    week:  summarizeToday(transactions.filter((tx) => isInPeriod(tx.transactionDate, "week"))),
    month: summarizeToday(transactions.filter((tx) => isInPeriod(tx.transactionDate, "month"))),
    all:   summarizeToday(transactions),
  };
}

function isInPeriod(isoDate: string, period: PeriodKey) {
  if (period === "all") return true;
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
