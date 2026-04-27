"use client";

import { useMemo } from "react";
import type { Transaction, DailySummary } from "@/lib/types";
import { formatTHB } from "@/lib/money";
import PeriodToggle from "@/components/period-toggle";

interface Props {
  transactions: Transaction[];
  periodSummary: Record<string, DailySummary>;
}

export default function OverviewView({ transactions, periodSummary }: Props) {
  const [period, setPeriod] = useMemo(() => {
    // Intentionally empty — PeriodToggle manages its own state
    return ["day"] as const;
  }, []);

  const summary = periodSummary.day;
  if (!summary) return null;

  return (
    <div className="grid gap-4">
      {/* Hero Card */}
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-neutral-900 to-neutral-950 p-5 sm:p-7">
        <PeriodToggle />
        
        <div className="mt-5 flex items-baseline gap-1">
          <span className="text-[32px] font-bold tracking-tight text-white">
            ฿{summary.totalExpense.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
          </span>
          <span className="text-sm text-white/30">วันนี้</span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: "รายรับ", value: summary.totalIncome, color: "text-emerald-400" },
            { label: "คงเหลือ", value: summary.netAmount, color: "text-white/60" },
            { label: "รายการ", value: summary.transactionCount, color: "text-white/40", isCount: true },
          ].map((m) => (
            <div key={m.label} className="rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
              <div className="text-[11px] text-white/30">{m.label}</div>
              <div className={`mt-1 text-lg font-semibold ${m.color}`}>
                {m.isCount ? m.value : `฿${m.value.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`}
              </div>
            </div>
          ))}
        </div>

        {summary.topCategory && (
          <div className="mt-4 flex items-center gap-2 text-sm text-white/40">
            <span>อันดับ 1:</span>
            <span className="font-medium text-white/70">{summary.topCategory}</span>
            <span className="text-white/20">·</span>
            <span>{summary.insight}</span>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 sm:grid-cols-2">
        <QuickCard label="สัปดาห์นี้" summary={periodSummary.week} />
        <QuickCard label="เดือนนี้" summary={periodSummary.month} />
      </div>
    </div>
  );
}

function QuickCard({ label, summary }: { label: string; summary: DailySummary | undefined }) {
  if (!summary || summary.transactionCount === 0) {
    return (
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="text-[11px] text-white/30">{label}</div>
        <div className="mt-2 text-sm text-white/20">ยังไม่มีรายการ</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="text-[11px] text-white/30">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white/80">
        ฿{summary.totalExpense.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
      </div>
      <div className="mt-1 flex gap-3 text-[11px] text-white/25">
        <span>{summary.transactionCount} รายการ</span>
        {summary.topCategory && <span>· {summary.topCategory}</span>}
      </div>
    </div>
  );
}
