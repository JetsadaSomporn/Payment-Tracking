import { z } from "zod";
import {
  checkRateLimit,
  jsonError,
  jsonOk,
  readJsonBody,
  requireCsrfToken,
  requireSameOrigin,
} from "@/lib/security/api";
import { decryptField, encryptField, hashField } from "@/lib/security/encryption";
import {
  createAuthenticatedSupabaseClient,
  requireAuthenticatedUser,
} from "@/lib/supabase/server";
import type { Transaction } from "@/lib/types";

const transactionSchema = z.object({
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.number().positive().max(100_000_000),
  fee: z.number().min(0).max(100_000).default(0),
  title: z.string().trim().min(1).max(120).transform(v => v.replace(/<[^>]*>?/gm, '')),
  categoryName: z.string().trim().min(1).max(60).transform(v => v.replace(/<[^>]*>?/gm, '')),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  transactionTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable()
    .optional(),
  bankName: z.string().trim().max(80).nullable().optional().transform(v => v ? v.replace(/<[^>]*>?/gm, '') : v),
  receiverName: z.string().trim().max(120).nullable().optional().transform(v => v ? v.replace(/<[^>]*>?/gm, '') : v),
  referenceNo: z.string().trim().max(80).nullable().optional().transform(v => v ? v.replace(/<[^>]*>?/gm, '') : v),
});

export async function GET(request: Request) {
  if (
    !(await checkRateLimit(request, {
      keyPrefix: "transactions-list",
      limit: 120,
      windowMs: 60_000,
    }))
  ) {
    return jsonError("too many requests", 429);
  }

  const auth = await requireAuthenticatedUser(request);

  if (!auth.ok) {
    return jsonError(auth.error, auth.status);
  }

  if (!auth.accessToken) {
    return jsonError("unauthorized", 401);
  }

  const supabase = createAuthenticatedSupabaseClient(auth.accessToken);
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id,type,amount,fee,currency,title,ai_category,bank_name,receiver_name,reference_no,transaction_date,transaction_time,source,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return jsonError("transaction load failed", 500);
  }

  return jsonOk(
    {
      ok: true,
      transactions: data.map((row) => mapTransactionRow(row, auth.user.id)),
    },
    {
      headers: {
        "Cache-Control": "private, max-age=5, stale-while-revalidate=30",
      },
    },
  );
}

export async function POST(request: Request) {
  if (!requireSameOrigin(request)) {
    return jsonError("forbidden origin", 403);
  }

  if (!requireCsrfToken(request)) {
    return jsonError("invalid csrf token", 403);
  }

  if (
    !(await checkRateLimit(request, {
      keyPrefix: "transactions",
      limit: 60,
      windowMs: 60_000,
    }))
  ) {
    return jsonError("too many requests", 429);
  }

  const auth = await requireAuthenticatedUser(request);

  if (!auth.ok) {
    return jsonError(auth.error, auth.status);
  }

  const body = await readJsonBody(request, 32 * 1024);

  if (!body.ok) {
    return jsonError(body.error, 400);
  }

  const parsed = transactionSchema.safeParse(body.value);

  if (!parsed.success) {
    return jsonError("invalid transaction payload", 400);
  }

  if (auth.mode === "local-dev" || !auth.accessToken) {
    return jsonError("Supabase persistence is required", 503);
  }

  const protectedFields = protectSensitiveFields(parsed.data);

  if (!protectedFields.ok) {
    return jsonError("transaction encryption is not configured", 503);
  }

  const supabase = createAuthenticatedSupabaseClient(auth.accessToken);
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: auth.user.id,
      type: parsed.data.type,
      amount: parsed.data.amount,
      fee: parsed.data.fee,
      currency: "THB",
      title: protectedFields.value.title,
      ai_category: parsed.data.categoryName,
      transaction_date: parsed.data.transactionDate,
      transaction_time: parsed.data.transactionTime || null,
      bank_name: protectedFields.value.bankName,
      receiver_name: protectedFields.value.receiverName,
      reference_no: protectedFields.value.referenceNo,
      reference_no_hash: protectedFields.value.referenceNoHash,
      source: "slip",
      status: "confirmed",
    })
    .select(
      "id,type,amount,fee,currency,title,ai_category,bank_name,receiver_name,reference_no,transaction_date,transaction_time,source,created_at",
    )
    .single();

  if (error) {
    console.error("[transactions:POST] supabase insert error", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    if (error.code === "23505") {
      return jsonError("duplicate transaction", 409);
    }

    // Profile might not exist yet — try to create one and retry
    if (error.code === "23503" && error.message?.includes("profiles")) {
      console.log("[transactions:POST] profile missing, attempting auto-create...");
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: auth.user.id,
          email: auth.user.email,
          display_name: auth.user.email?.split("@")[0] ?? null,
        }, { onConflict: "id" });

      if (!profileError) {
        // Retry the insert
        const { data: retryData, error: retryError } = await supabase
          .from("transactions")
          .insert({
            user_id: auth.user.id,
            type: parsed.data.type,
            amount: parsed.data.amount,
            fee: parsed.data.fee,
            currency: "THB",
            title: protectedFields.value.title,
            ai_category: parsed.data.categoryName,
            transaction_date: parsed.data.transactionDate,
            transaction_time: parsed.data.transactionTime || null,
            bank_name: protectedFields.value.bankName,
            receiver_name: protectedFields.value.receiverName,
            reference_no: protectedFields.value.referenceNo,
            reference_no_hash: protectedFields.value.referenceNoHash,
            source: "slip",
            status: "confirmed",
          })
          .select(
            "id,type,amount,fee,currency,title,ai_category,bank_name,receiver_name,reference_no,transaction_date,transaction_time,source,created_at",
          )
          .single();

        if (!retryError) {
          return jsonOk({
            ok: true,
            transaction: mapTransactionRow(retryData, auth.user.id),
          });
        }

        console.error("[transactions:POST] retry after profile create failed", {
          code: retryError.code,
          message: retryError.message,
        });
      } else {
        console.error("[transactions:POST] profile auto-create failed", {
          code: profileError.code,
          message: profileError.message,
        });
      }
    }

    return jsonError("transaction save failed", 500);
  }

  return jsonOk({
    ok: true,
    transaction: mapTransactionRow(data, auth.user.id),
  });
}

export async function DELETE(request: Request) {
  if (!requireSameOrigin(request)) {
    return jsonError("forbidden origin", 403);
  }

  if (!requireCsrfToken(request)) {
    return jsonError("invalid csrf token", 403);
  }

  if (
    !(await checkRateLimit(request, {
      keyPrefix: "transactions",
      limit: 60,
      windowMs: 60_000,
    }))
  ) {
    return jsonError("too many requests", 429);
  }

  const auth = await requireAuthenticatedUser(request);

  if (!auth.ok) {
    return jsonError(auth.error, auth.status);
  }

  if (!auth.accessToken) {
    return jsonError("unauthorized", 401);
  }

  // Extract transaction ID from URL: /api/transactions?id=xxx
  const url = new URL(request.url);
  const txId = url.searchParams.get("id");

  if (!txId) {
    return jsonError("transaction id is required", 400);
  }

  const supabase = createAuthenticatedSupabaseClient(auth.accessToken);
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", txId)
    .eq("user_id", auth.user.id); // RLS double-check

  if (error) {
    console.error("[transactions:DELETE] supabase delete error", {
      code: error.code,
      message: error.message,
    });
    return jsonError("transaction delete failed", 500);
  }

  return jsonOk({ ok: true });
}

function mapTransactionRow(
  row: Record<string, unknown>,
  userId: string,
): Transaction & { userId: string } {
  return {
    id: String(row.id),
    userId,
    type: row.type as Transaction["type"],
    amount: Number(row.amount),
    fee: Number(row.fee),
    currency: "THB",
    title: decryptField(String(row.title)),
    categoryName: String(row.ai_category ?? "อื่น ๆ"),
    bankName: row.bank_name ? decryptField(String(row.bank_name)) : null,
    receiverName: row.receiver_name ? decryptField(String(row.receiver_name)) : null,
    referenceNo: row.reference_no ? decryptField(String(row.reference_no)) : null,
    transactionDate: String(row.transaction_date),
    transactionTime: row.transaction_time ? String(row.transaction_time) : null,
    source: "slip",
    createdAt: String(row.created_at),
  };
}

function protectSensitiveFields(data: z.infer<typeof transactionSchema>) {
  try {
    return {
      ok: true as const,
      value: {
        title: encryptField(data.title),
        bankName: data.bankName ? encryptField(data.bankName) : null,
        receiverName: data.receiverName ? encryptField(data.receiverName) : null,
        referenceNo: data.referenceNo ? encryptField(data.referenceNo) : null,
        referenceNoHash: hashField(data.referenceNo),
      },
    };
  } catch {
    return { ok: false as const };
  }
}
