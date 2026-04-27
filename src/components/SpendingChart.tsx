"use client";

import { useMemo } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Transaction } from "@/lib/types";

export function SpendingChart({ transactions }: { transactions: Transaction[] }) {
  const data = useMemo(() => {
    // Group transactions by date
    const grouped = transactions.reduce((acc, tx) => {
      if (tx.type === "income" || tx.type === "transfer") return acc;
      const date = tx.transactionDate.substring(5); // e.g., "2026-04-27" -> "04-27"
      acc[date] = (acc[date] || 0) + tx.amount;
      return acc;
    }, {} as Record<string, number>);

    // Convert to sorted array
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));
  }, [transactions]);

  if (data.length === 0) {
    return (
      <div className="h-[200px] w-full flex items-center justify-center text-[13px] text-[var(--muted)] border border-dashed border-[var(--line)] rounded-xl bg-[var(--soft)] mt-4">
        Insufficient data for trend chart
      </div>
    );
  }

  return (
    <div className="h-[200px] w-full mt-6">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: 'var(--muted)' }} 
            dy={10} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: 'var(--muted)' }} 
            tickFormatter={(val) => `฿${val}`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--panel)', 
              borderRadius: '8px',
              border: '1px solid var(--line)',
              boxShadow: 'var(--shadow-premium)',
              fontSize: '12px'
            }} 
            itemStyle={{ color: 'var(--foreground)', fontWeight: 600 }}
            formatter={(value: any) => [`฿${Number(value).toLocaleString()}`, 'Expense']}
            labelStyle={{ color: 'var(--muted)', marginBottom: '4px' }}
          />
          <Area 
            type="monotone" 
            dataKey="amount" 
            stroke="var(--accent)" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorAmount)" 
            activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--accent)' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}