"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { Transaction } from "@/lib/types";
import { formatTHB } from "@/lib/money";
import PeriodToggle from "@/components/period-toggle";

interface Props {
  transactions: Transaction[];
  onDelete?: (txId: string) => void;
}

interface GroupedDay {
  dateLabel: string;
  dateIso: string;
  items: Transaction[];
}

export default function TimelineView({ transactions, onDelete }: Props) {
  const searchParams = useSearchParams();
  const period = searchParams.get("period") ?? "day";

  const filtered = useMemo(() => {
    if (period === "all") return transactions;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    if (period === "day") return transactions.filter((t) => t.transactionDate === today);

    if (period === "week") {
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - mondayOffset);
      const weekStart = monday.toISOString().slice(0, 10);
      return transactions.filter((t) => t.transactionDate >= weekStart && t.transactionDate <= today);
    }

    if (period === "month") {
      const monthStart = today.slice(0, 8) + "01";
      return transactions.filter((t) => t.transactionDate >= monthStart && t.transactionDate <= today);
    }

    return transactions;
  }, [transactions, period]);

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of filtered) {
      const list = map.get(tx.transactionDate) ?? [];
      list.push(tx);
      map.set(tx.transactionDate, list);
    }

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    const result: GroupedDay[] = [];
    for (const [dateIso, items] of map) {
      let dateLabel: string;
      if (dateIso === today) dateLabel = "วันนี้";
      else if (dateIso === yesterday) dateLabel = "เมื่อวาน";
      else {
        const [y, m, d] = dateIso.split("-");
        const thaiMonths = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
        dateLabel = `${+d} ${thaiMonths[+m]} ${(+y + 543) % 100}`;
      }
      result.push({ dateLabel, dateIso, items: items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
    }
    return result.sort((a, b) => b.dateIso.localeCompare(a.dateIso));
  }, [filtered]);

  if (grouped.length === 0) {
    return (
      <div className="space-y-5">
        <PeriodToggle />
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-[var(--soft)] text-[var(--text-disabled)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <p className="text-[15px] text-[var(--muted)]">ยังไม่มีรายการในช่วงนี้</p>
          <p className="text-[13px] text-[var(--text-disabled)]">เริ่มบันทึกรายการแรกของคุณ</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PeriodToggle />

      <div className="space-y-8">
        {grouped.map((group) => {
          const groupTotal = group.items.reduce((sum, t) => {
            if (t.type === "income") return sum - t.amount - t.fee;
            return sum + t.amount + t.fee;
          }, 0);

          return (
            <div key={group.dateIso}>
              <div className="mb-4 flex items-center gap-3">
                <h3 className="text-[13px] font-semibold text-[var(--text-secondary)]">{group.dateLabel}</h3>
                <div className="flex-1 border-b border-[var(--border-subtle)]" />
                <span className="font-figures text-[12px] text-[var(--text-muted)]">
                  ฿{Math.abs(groupTotal).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="space-y-1.5">
                {group.items.map((tx) => {
                  const isIncome = tx.type === "income";
                  const isTransfer = tx.type === "transfer";
                  const prefix = isIncome ? "+" : isTransfer ? "⇄" : "−";
                  const colorClass = isIncome ? "text-[var(--income)]" : isTransfer ? "text-[var(--text-secondary)]" : "text-[var(--text-primary)]";

                  return (
                    <div
                      key={tx.id}
                      className="group flex items-center gap-3.5 rounded-xl border border-transparent px-3.5 py-3.5 transition-colors hover:bg-[var(--soft)] hover:border-[var(--border-subtle)]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-medium text-[var(--text-primary)] truncate">
                          {tx.title || tx.receiverName || tx.categoryName}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-2 text-[12px] text-[var(--text-muted)]">
                          <span>{tx.categoryName}</span>
                          {tx.bankName && <span>· {tx.bankName}</span>}
                          {tx.transactionTime && <span>· {tx.transactionTime}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-figures text-[15px] font-semibold ${colorClass}`}>
                          {prefix}฿{(tx.amount + tx.fee).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </span>
                        {onDelete && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDelete(tx.id); }}
                            className="shrink-0 rounded-lg p-1.5 text-[var(--text-disabled)] opacity-0 transition-all hover:bg-[var(--expense-soft)] hover:text-[var(--expense)] group-hover:opacity-100"
                            title="ลบรายการ"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
