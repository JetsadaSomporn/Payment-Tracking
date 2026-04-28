import { checkRateLimit, jsonError, jsonOk, requireSameOrigin, requireCsrfToken } from "@/lib/security/api";
import { createAuthenticatedSupabaseClient, requireAuthenticatedUser } from "@/lib/supabase/server";

/**
 * DELETE /api/transactions/delete-all
 *
 * Permanently deletes ALL user data:
 * - transactions
 * - slips
 * - daily_summaries
 * - budgets
 * - merchant_rules
 * - ai_logs
 * - categories (non-system)
 *
 * Requires CSRF + Same-Origin for safety.
 */
export async function DELETE(request: Request) {
  if (!requireSameOrigin(request)) return jsonError("forbidden origin", 403);
  if (!requireCsrfToken(request)) return jsonError("invalid csrf token", 403);

  if (!(await checkRateLimit(request, { keyPrefix: "delete-all", limit: 1, windowMs: 300_000 }))) {
    return jsonError("too many requests — wait 5 minutes between delete-all operations", 429);
  }

  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  if (!auth.accessToken) return jsonError("unauthorized", 401);

  const supabase = createAuthenticatedSupabaseClient(auth.accessToken);
  const userId = auth.user.id;

  const tables = [
    "transactions",
    "slips",
    "daily_summaries",
    "budgets",
    "merchant_rules",
    "ai_logs",
    "categories",
  ];

  const errors: string[] = [];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error(`[delete-all] failed to clear ${table}`, { code: error.code, message: error.message });
      errors.push(table);
    }
  }

  if (errors.length > 0) {
    return jsonError(`partial failure — could not clear: ${errors.join(", ")}`, 500);
  }

  console.log(`[delete-all] user ${userId} data wiped successfully`);
  return jsonOk({ ok: true, message: "All data deleted" });
}
