import type { Transaction } from "@/lib/types";

export type VaultFile = { path: string; content: string };

function thb(amount: number): string {
  return `฿${amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}`;
}

function thaiMonth(iso: string): string {
  const [y, m] = iso.split("-");
  const labels = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${labels[+m]} ${((+y + 543) % 100).toString().padStart(2, "0")}`;
}

function safeName(s: string): string {
  return s.replace(/[/\\:*?"<>|#^[\]]/g, "-").trim() || "unnamed";
}

export function buildVaultFiles(transactions: Transaction[]): VaultFile[] {
  const expenses = transactions.filter((t) => t.type === "expense");
  if (expenses.length === 0) return [];

  const byCategory = new Map<string, Transaction[]>();
  const byMerchant = new Map<string, Transaction[]>();
  const byMonth = new Map<string, Transaction[]>();

  for (const tx of expenses) {
    const merchant = tx.bankName ?? tx.receiverName ?? tx.title;
    const month = tx.transactionDate.slice(0, 7);
    const push = (m: Map<string, Transaction[]>, k: string) => {
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(tx);
    };
    push(byCategory, tx.categoryName);
    push(byMerchant, merchant);
    push(byMonth, month);
  }

  const totalAll = expenses.reduce((s, t) => s + t.amount, 0);
  const today = new Date().toISOString().slice(0, 10);
  const files: VaultFile[] = [];

  // ── Overview / MOC ──────────────────────────────────────────────────────
  const catRanked = [...byCategory.entries()]
    .map(([cat, txs]) => ({ cat, total: txs.reduce((s, t) => s + t.amount, 0) }))
    .sort((a, b) => b.total - a.total);

  const merchantRanked = [...byMerchant.entries()]
    .map(([m, txs]) => ({ m, total: txs.reduce((s, t) => s + t.amount, 0) }))
    .sort((a, b) => b.total - a.total);

  files.push({
    path: "Spendly/💰 Overview.md",
    content: [
      "---",
      "type: spendly-overview",
      `generated: ${today}`,
      `total_expense: ${totalAll.toFixed(2)}`,
      `transaction_count: ${expenses.length}`,
      "tags: [spendly]",
      "---",
      "",
      "# 💰 Spendly — Spending Overview",
      "",
      `> สร้างจาก Spendly เมื่อ ${today}`,
      "",
      `**รายจ่ายทั้งหมด:** ${thb(totalAll)}  `,
      `**จำนวนรายการ:** ${expenses.length}`,
      "",
      "## หมวดหมู่",
      ...catRanked.map(({ cat, total }) => {
        const pct = ((total / totalAll) * 100).toFixed(1);
        return `- [[${cat}]] — ${thb(total)} (${pct}%)`;
      }),
      "",
      "## เดือน",
      ...[...byMonth.keys()].sort().reverse().map((m) => `- [[${thaiMonth(m)}]]`),
      "",
      "## ผู้รับ / ธนาคาร (Top 10)",
      ...merchantRanked.slice(0, 10).map(({ m, total }) => `- [[${safeName(m)}|${m}]] — ${thb(total)}`),
    ].join("\n"),
  });

  // ── Category files ───────────────────────────────────────────────────────
  for (const [cat, txs] of byCategory) {
    const total = txs.reduce((s, t) => s + t.amount, 0);
    const merchants = [...new Set(txs.map((t) => t.bankName ?? t.receiverName ?? t.title))];
    const months = [...new Set(txs.map((t) => t.transactionDate.slice(0, 7)))].sort().reverse();

    files.push({
      path: `Spendly/Categories/${safeName(cat)}.md`,
      content: [
        "---",
        "type: spending-category",
        `category: "${cat}"`,
        `total: ${total.toFixed(2)}`,
        `count: ${txs.length}`,
        "tags: [spendly/category]",
        "---",
        "",
        `# ${cat}`,
        "",
        `**รวม:** ${thb(total)}  `,
        `**รายการ:** ${txs.length}  `,
        `← [[💰 Overview]]`,
        "",
        "## ผู้รับ / ธนาคาร",
        ...merchants.map((m) => `- [[${safeName(m)}|${m}]]`),
        "",
        "## เดือน",
        ...months.map((m) => `- [[${thaiMonth(m)}]]`),
        "",
        "## รายการ",
        ...txs
          .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
          .map((tx) => `- ${tx.transactionDate}${tx.transactionTime ? ` ${tx.transactionTime}` : ""} · **${thb(tx.amount)}** · ${tx.title}`),
      ].join("\n"),
    });
  }

  // ── Merchant files ───────────────────────────────────────────────────────
  for (const [merchant, txs] of byMerchant) {
    const total = txs.reduce((s, t) => s + t.amount, 0);
    const cats = [...new Set(txs.map((t) => t.categoryName))];
    const months = [...new Set(txs.map((t) => t.transactionDate.slice(0, 7)))].sort().reverse();

    files.push({
      path: `Spendly/Merchants/${safeName(merchant)}.md`,
      content: [
        "---",
        "type: spending-merchant",
        `merchant: "${merchant}"`,
        `total: ${total.toFixed(2)}`,
        `count: ${txs.length}`,
        "tags: [spendly/merchant]",
        "---",
        "",
        `# ${merchant}`,
        "",
        `**รวมที่จ่าย:** ${thb(total)}  `,
        `**ครั้ง:** ${txs.length}  `,
        `← [[💰 Overview]]`,
        "",
        "## หมวดหมู่",
        ...cats.map((c) => `- [[${safeName(c)}|${c}]]`),
        "",
        "## เดือน",
        ...months.map((m) => `- [[${thaiMonth(m)}]]`),
        "",
        "## รายการ",
        ...txs
          .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
          .map((tx) => `- ${tx.transactionDate}${tx.transactionTime ? ` ${tx.transactionTime}` : ""} · **${thb(tx.amount)}** · ${tx.title}`),
      ].join("\n"),
    });
  }

  // ── Month files ──────────────────────────────────────────────────────────
  for (const [month, txs] of byMonth) {
    const total = txs.reduce((s, t) => s + t.amount, 0);
    const label = thaiMonth(month);

    const catBreakdown = [...byCategory.entries()]
      .map(([cat, catTxs]) => ({
        cat,
        total: catTxs.filter((t) => t.transactionDate.startsWith(month)).reduce((s, t) => s + t.amount, 0),
      }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total);

    files.push({
      path: `Spendly/Months/${label}.md`,
      content: [
        "---",
        "type: spending-month",
        `month: "${month}"`,
        `month_label: "${label}"`,
        `total: ${total.toFixed(2)}`,
        `count: ${txs.length}`,
        "tags: [spendly/month]",
        "---",
        "",
        `# ${label}`,
        "",
        `**รวม:** ${thb(total)}  `,
        `**รายการ:** ${txs.length}  `,
        `← [[💰 Overview]]`,
        "",
        "## หมวดหมู่",
        ...catBreakdown.map(({ cat, total: t }) => `- [[${safeName(cat)}|${cat}]] — ${thb(t)}`),
        "",
        "## รายการ",
        ...txs
          .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
          .map((tx) => {
            const m = tx.bankName ?? tx.receiverName ?? tx.title;
            return `- ${tx.transactionDate}${tx.transactionTime ? ` ${tx.transactionTime}` : ""} · **${thb(tx.amount)}** · [[${safeName(m)}|${m}]]`;
          }),
      ].join("\n"),
    });
  }

  return files;
}

export async function writeToObsidianVault(
  files: VaultFile[],
): Promise<{ written: number; folder: string }> {
  if (!("showDirectoryPicker" in window)) {
    throw new Error("ต้องใช้ Chrome หรือ Edge เพื่อเขียนไฟล์ไปยัง Obsidian vault โดยตรง");
  }

  // showDirectoryPicker is defined in @types/wicg-file-system-access but not in lib.dom
  type ShowDirPicker = (opts?: { mode?: string }) => Promise<FileSystemDirectoryHandle>;
  const rootHandle = await (window as Window & { showDirectoryPicker: ShowDirPicker }).showDirectoryPicker({ mode: "readwrite" });

  for (const file of files) {
    const parts = file.path.split("/");
    let dir: FileSystemDirectoryHandle = rootHandle;

    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i]!, { create: true });
    }

    const fileName = parts[parts.length - 1]!;
    const fileHandle = await dir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file.content);
    await writable.close();
  }

  return { written: files.length, folder: rootHandle.name };
}
