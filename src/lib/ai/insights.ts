export type InsightContext = {
  totalExpense: number;
  totalIncome: number;
  transactionCount: number;
  categories: Array<{ name: string; amount: number; count: number }>;
  period?: string;
  question?: string;
};

export async function generateInsight(ctx: InsightContext): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  const baseUrl = process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1";
  const model = process.env.NVIDIA_INSIGHT_MODEL ?? "meta/llama-3.3-70b-instruct";

  if (!apiKey || apiKey.includes("...") || apiKey.startsWith("replace-")) {
    throw new Error("NVIDIA_API_KEY is not configured");
  }

  const catLines = ctx.categories
    .slice(0, 10)
    .map(c => `- ${c.name}: ${c.amount.toFixed(0)} บาท (${c.count} รายการ)`)
    .join("\n");

  const periodLine = ctx.period ? `ช่วงเวลา: ${ctx.period}\n` : "";

  const dataBlock = [
    periodLine,
    `รายจ่ายรวม: ${ctx.totalExpense.toFixed(2)} บาท`,
    `รายรับรวม:  ${ctx.totalIncome.toFixed(2)} บาท`,
    `ยอดสุทธิ:   ${(ctx.totalIncome - ctx.totalExpense).toFixed(2)} บาท`,
    `จำนวนรายการ: ${ctx.transactionCount}`,
    `หมวดหมู่:\n${catLines || "ไม่มีข้อมูล"}`,
  ].join("\n");

  const userMessage = ctx.question
    ? `ข้อมูลการเงินของฉัน:\n${dataBlock}\n\nคำถาม: ${ctx.question}`
    : `ข้อมูลการเงินของฉัน:\n${dataBlock}\n\nช่วยวิเคราะห์ภาพรวมและบอกว่าควรปรับอะไรบ้าง`;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "คุณเป็นผู้ช่วยการเงินส่วนตัว พูดภาษาไทยแบบเป็นกันเอง ตรงประเด็น ไม่ต้องยาว ไม่ต้องมีหัวข้อหรือ bullet ตอบเหมือนคุยกับเพื่อน วิจารณ์ได้ตรงๆ และแนะนำสิ่งที่ทำได้จริง",
        },
        { role: "user", content: userMessage },
      ],
      max_tokens: 400,
      temperature: 0.65,
    }),
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(err?.error?.message ?? `AI insight failed (${response.status})`);
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned no content");
  return content.trim();
}
