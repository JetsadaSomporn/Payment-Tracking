"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ReceiptText,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import type { Transaction, DailySummary } from "@/lib/types";
import PeriodToggle from "@/components/period-toggle";

const periodLabel: Record<string, string> = {
  day:   "วันนี้",
  week:  "สัปดาห์นี้",
  month: "เดือนนี้",
  all:   "ทั้งหมด",
};

interface Props {
  transactions: Transaction[];
  periodSummary: Record<string, DailySummary>;
}

export default function OverviewView({ periodSummary }: Props) {
  const searchParams = useSearchParams();
  const period = searchParams.get("period") ?? "day";
  const active = periodSummary[period] ?? periodSummary.day;
  const label = periodLabel[period] ?? "วันนี้";

  const dateStr = new Intl.DateTimeFormat("th-TH", {
    day: "numeric", month: "long", year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date());

  return (
    <div className="grid gap-5">
      {/* ── Hero ── */}
      <div className="app-hero-panel animate-in overflow-hidden p-6 sm:p-8 lg:p-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <CalendarDays size={13} className="text-[var(--muted)]" />
            <span className="text-[12px] font-medium text-[var(--muted)]">Bangkok · {dateStr}</span>
          </div>
          <PeriodToggle />
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="app-hero-currency mt-1">฿</span>
          <span className="hero-amount">
            {(active?.totalExpense ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-4 text-sm text-[var(--text-secondary)]">
          {active?.transactionCount ? (
            <span>{active.transactionCount} รายการ{label}</span>
          ) : (
            <span>ยังไม่มีรายการ{label}</span>
          )}
          {active?.topCategory && (
            <>
              <span className="text-[var(--border-subtle)]">·</span>
              <span>อันดับ 1: {active.topCategory}</span>
            </>
          )}
        </div>

        <div className="mt-7 grid grid-cols-3 gap-3">
          <MiniMetric label="รายรับ" value={active?.totalIncome ?? 0} color="var(--income)" />
          <MiniMetric label="สุทธิ" value={active?.netAmount ?? 0} color="var(--text-secondary)" />
          <MiniMetric label="รายการ" value={active?.transactionCount ?? 0} isCount />
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <Link className="dock-action is-primary" href="/upload">
            <UploadCloud size={15} />
            Upload slip
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

      {/* ── Sub-cards — only when viewing 'day' to avoid redundancy ── */}
      {period === "day" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryCard label="สัปดาห์นี้" summary={periodSummary.week} />
          <SummaryCard label="เดือนนี้" summary={periodSummary.month} />
        </div>
      )}
    </div>
  );
}

function MiniMetric({ label, value, color, isCount }: { label: string; value: number; color?: string; isCount?: boolean }) {
  return (
    <div className="metric-tile">
      <div className="text-[12px] font-medium text-[var(--text-muted)]">{label}</div>
      <div className="metric-value" style={color && !isCount ? { color } : undefined}>
        {isCount ? value : `฿${value.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`}
      </div>
    </div>
  );
}

function SummaryCard({ label, summary }: { label: string; summary: DailySummary | undefined }) {
  if (!summary || summary.transactionCount === 0) {
    return (
      <div className="period-card">
        <div className="text-[13px] font-medium text-[var(--text-muted)]">{label}</div>
        <div className="mt-3 text-sm text-[var(--text-disabled)]">ยังไม่มีรายการ</div>
      </div>
    );
  }
  return (
    <div className="period-card">
      <div className="text-[13px] font-medium text-[var(--text-muted)]">{label}</div>
      <div className="mt-2 text-[22px] font-semibold tracking-tight">
        ฿{summary.totalExpense.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
        <span>{summary.transactionCount} รายการ</span>
        {summary.topCategory && (
          <>
            <span className="opacity-30">·</span>
            <span>{summary.topCategory}</span>
          </>
        )}
      </div>
    </div>
  );
}
