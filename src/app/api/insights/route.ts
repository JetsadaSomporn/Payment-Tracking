import { z } from "zod";
import { generateInsight } from "@/lib/ai/insights";
import {
  checkRateLimit,
  jsonError,
  jsonOk,
  readJsonBody,
  requireCsrfToken,
  requireSameOrigin,
} from "@/lib/security/api";
import { requireAuthenticatedUser } from "@/lib/supabase/server";

const insightSchema = z.object({
  totalExpense: z.number().nonnegative().max(1_000_000_000),
  totalIncome: z.number().nonnegative().max(1_000_000_000),
  transactionCount: z.number().int().min(0).max(50_000),
  categories: z
    .array(
      z.object({
        name: z.string().max(60).transform(v => v.replace(/<[^>]*>?/gm, "")),
        amount: z.number().nonnegative().max(1_000_000_000),
        count: z.number().int().min(0),
      }),
    )
    .max(20),
  period: z.string().max(40).optional().transform(v => (v ? v.replace(/<[^>]*>?/gm, "") : v)),
  question: z
    .string()
    .max(400)
    .optional()
    .transform(v => (v ? v.replace(/<[^>]*>?/gm, "") : v)),
});

export async function POST(request: Request) {
  if (!requireSameOrigin(request)) return jsonError("forbidden origin", 403);
  if (!requireCsrfToken(request)) return jsonError("invalid csrf token", 403);

  if (
    !(await checkRateLimit(request, {
      keyPrefix: "insights",
      limit: 10,
      windowMs: 60_000,
    }))
  ) {
    return jsonError("too many requests", 429);
  }

  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const body = await readJsonBody(request, 32 * 1024);
  if (!body.ok) return jsonError(body.error, 400);

  const parsed = insightSchema.safeParse(body.value);
  if (!parsed.success) return jsonError("invalid payload", 400);

  try {
    const insight = await generateInsight(parsed.data);
    return jsonOk({ ok: true, insight });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI insight failed";
    return jsonError(msg, 500);
  }
}
