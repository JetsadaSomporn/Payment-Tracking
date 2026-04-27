"use client";

import type { Transaction, DailySummary } from "@/lib/types";
import PeriodToggle from "@/components/period-toggle";

interface Props {
  transactions: Transaction[];
  periodSummary: Record<string, DailySummary>;
}

export default function OverviewView({ transactions, periodSummary }: Props) {
  const today = periodSummary.day;
  const week = periodSummary.week;
  const month = periodSummary.month;

  return (
    <div className="grid gap-4">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="app-hero-panel overflow-hidden p-5 sm:p-7 lg:p-9">
        <div className="flex items-center justify-between mb-5">
          <PeriodToggle />
          <span className="text-[11px] text-[var(--text-muted)]">
            {new Intl.DateTimeFormat("th-TH", {
              day: "numeric", month: "long", year: "numeric",
              timeZone: "Asia/Bangkok",
            }).format(new Date())}
          </span>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="app-hero-currency">฿</span>
          <span className="hero-amount">
            {(today?.totalExpense ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-4 text-sm text-[var(--text-secondary)]">
          {today ? (
            <span>{today.transactionCount} รายการวันนี้</span>
          ) : (
            <span>ยังไม่มีรายการวันนี้</span>
          )}
          {today?.topCategory && (
            <>
              <span className="text-[var(--border-subtle)]">·</span>
              <span>อันดับ 1: {today.topCategory}</span>
            </>
          )}
        </div>

        {/* Mini metric row */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <MiniMetric label="รายรับ" value={today?.totalIncome ?? 0} color="var(--income)" />
          <MiniMetric label="สุทธิ" value={today?.netAmount ?? 0} color="var(--text-secondary)" />
          <MiniMetric label="รายการ" value={today?.transactionCount ?? 0} isCount />
        </div>
      </div>

      {/* ── Week / Month summary cards ────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard label="สัปดาห์นี้" summary={week} />
        <SummaryCard label="เดือนนี้" summary={month} />
      </div>
    </div>
  );
}

function MiniMetric({ label, value, color, isCount }: { label: string; value: number; color?: string; isCount?: boolean }) {
  return (
    <div className="metric-tile">
      <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
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
        <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
        <div className="mt-3 text-sm text-[var(--text-disabled)]">ยังไม่มีรายการ</div>
      </div>
    );
  }
  return (
    <div className="period-card">
      <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
      <div className="mt-2 text-xl font-semibold tracking-tight">
        ฿{summary.totalExpense.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
        <span>{summary.transactionCount} รายการ</span>
        {summary.topCategory && (
          <>
            <span className="text-[var(--border-subtle)]">·</span>
            <span>{summary.topCategory}</span>
          </>
        )}
      </div>
    </div>
  );
}
