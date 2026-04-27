"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { Transaction } from "@/lib/types";
import { formatTHB } from "@/lib/money";
import PeriodToggle from "@/components/period-toggle";

interface Props {
  transactions: Transaction[];
}

interface GroupedDay {
  dateLabel: string;
  dateIso: string;
  items: Transaction[];
}

export default function TimelineView({ transactions }: Props) {
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
      <div className="space-y-4">
        <PeriodToggle />
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-white/20">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span className="text-sm">ยังไม่มีรายการในช่วงนี้</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PeriodToggle />

      <div className="space-y-6">
        {grouped.map((group) => (
          <div key={group.dateIso}>
            <div className="mb-3 flex items-center gap-3">
              <h3 className="text-sm font-semibold text-white/50">{group.dateLabel}</h3>
              <div className="flex-1 border-b border-white/[0.05]" />
              <span className="text-[11px] text-white/20">
                ฿{group.items.reduce((sum, t) => sum + t.amount + t.fee, 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="space-y-2">
              {group.items.map((tx) => (
                <div
                  key={tx.id}
                  className="group flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3 hover:bg-white/[0.04] transition-colors"
                >
                  {/* Category dot */}
                  <div className="h-2.5 w-2.5 rounded-full bg-orange-500 shrink-0" />

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white/80 truncate">
                      {tx.title || tx.receiverName || tx.categoryName}
                    </div>
                    <div className="mt-0.5 flex gap-2 text-[11px] text-white/25">
                      <span>{tx.categoryName}</span>
                      {tx.bankName && <span>· {tx.bankName}</span>}
                      {tx.transactionTime && <span>· {tx.transactionTime}</span>}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className={`text-sm font-semibold shrink-0 ${tx.type === "expense" ? "text-red-400" : "text-emerald-400"}`}>
                    {tx.type === "expense" ? "-" : "+"}
                    ฿{(tx.amount + tx.fee).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
