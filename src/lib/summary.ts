import type { DailySummary, Transaction } from "@/lib/types";

export function summarizeToday(transactions: Transaction[]): DailySummary {
  const totalIncome = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount + item.fee, 0);
  const categoryTotals = new Map<string, number>();

  for (const item of transactions) {
    if (item.type !== "expense") {
      continue;
    }

    categoryTotals.set(
      item.categoryName,
      (categoryTotals.get(item.categoryName) ?? 0) + item.amount + item.fee,
    );
  }

  const topCategory =
    [...categoryTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    totalIncome,
    totalExpense,
    netAmount: totalIncome - totalExpense,
    transactionCount: transactions.length,
    topCategory,
    insight: buildInsight(transactions.length, totalExpense, topCategory),
  };
}

function buildInsight(
  count: number,
  totalExpense: number,
  topCategory: string | null,
) {
  if (count === 0) {
    return "วันนี้ยังไม่มีรายการที่บันทึก";
  }

  if (!topCategory) {
    return "วันนี้มีข้อมูลรายรับ แต่ยังไม่มีรายจ่ายให้วิเคราะห์";
  }

  if (count === 1) {
    return `วันนี้มีรายจ่าย 1 รายการ รวม ${totalExpense.toFixed(2)} บาท ยังสรุป pattern ไม่ได้`;
  }

  return `วันนี้ใช้หนักสุดในหมวด ${topCategory} จากทั้งหมด ${count} รายการ`;
}
