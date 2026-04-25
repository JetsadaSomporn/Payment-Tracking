import { z } from "zod";
import { summarizeToday } from "@/lib/summary";
import {
  checkRateLimit,
  jsonError,
  jsonOk,
  readJsonBody,
  requireCsrfToken,
  requireSameOrigin,
} from "@/lib/security/api";
import { requireAuthenticatedUser } from "@/lib/supabase/server";

const transactionItemSchema = z.object({
  id: z.string(),
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.number().nonnegative().max(100_000_000),
  fee: z.number().nonnegative().max(100_000),
  currency: z.literal("THB"),
  title: z.string().max(120).transform(v => v.replace(/<[^>]*>?/gm, '')),
  categoryName: z.string().max(60).transform(v => v.replace(/<[^>]*>?/gm, '')),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transactionTime: z.string().nullable().optional(),
  source: z.enum(["slip", "manual"]),
  createdAt: z.string(),
});

const summaryPayloadSchema = z.object({
  transactions: z.array(transactionItemSchema).max(500).default([]),
});

export async function POST(request: Request) {
  if (!requireSameOrigin(request)) {
    return jsonError("forbidden origin", 403);
  }

  if (!requireCsrfToken(request)) {
    return jsonError("invalid csrf token", 403);
  }

  if (
    !(await checkRateLimit(request, {
      keyPrefix: "daily-summary",
      limit: 30,
      windowMs: 60_000,
    }))
  ) {
    return jsonError("too many requests", 429);
  }

  const auth = await requireAuthenticatedUser(request);

  if (!auth.ok) {
    return jsonError(auth.error, auth.status);
  }

  const body = await readJsonBody(request, 128 * 1024);

  if (!body.ok) {
    return jsonError(body.error, 400);
  }

  const parsed = summaryPayloadSchema.safeParse(body.value);

  if (!parsed.success) {
    return jsonError("invalid transactions payload", 400);
  }

  const summary = summarizeToday(parsed.data.transactions);

  return jsonOk({
    ok: true,
    userId: auth.user.id,
    provider: "local",
    summary,
  });
}
