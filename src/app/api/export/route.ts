import { checkRateLimit, jsonError } from "@/lib/security/api";
import { decryptField } from "@/lib/security/encryption";
import { createAuthenticatedSupabaseClient, requireAuthenticatedUser } from "@/lib/supabase/server";

/**
 * GET /api/export?format=csv
 *
 * Exports all user transactions as CSV.
 * Decrypts sensitive fields before export.
 */
export async function GET(request: Request) {
  if (!(await checkRateLimit(request, { keyPrefix: "export", limit: 5, windowMs: 60_000 }))) {
    return jsonError("too many requests", 429);
  }

  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  if (!auth.accessToken) return jsonError("unauthorized", 401);

  const supabase = createAuthenticatedSupabaseClient(auth.accessToken);

  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id,type,amount,fee,currency,title,ai_category,bank_name,receiver_name,reference_no,transaction_date,transaction_time,source,status,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(10_000);

  if (error) {
    console.error("[export] supabase error", { code: error.code, message: error.message });
    return jsonError("export failed", 500);
  }

  // CSV header
  const headers = [
    "ID", "Type", "Amount", "Fee", "Currency", "Title",
    "Category", "Bank", "Receiver", "Reference No",
    "Date", "Time", "Source", "Status", "Created At",
  ];

  const escapeCsv = (val: string | null | undefined): string => {
    if (val == null) return "";
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = data.map((row: Record<string, unknown>) => [
    row.id,
    row.type,
    row.amount,
    row.fee,
    row.currency,
    decryptField(String(row.title ?? "")),
    row.ai_category,
    row.bank_name ? decryptField(String(row.bank_name)) : "",
    row.receiver_name ? decryptField(String(row.receiver_name)) : "",
    row.reference_no ? decryptField(String(row.reference_no)) : "",
    row.transaction_date,
    row.transaction_time ?? "",
    row.source,
    row.status,
    row.created_at,
  ].map(escapeCsv).join(","));

  const csv = [headers.join(","), ...rows].join("\n");

  const bom = "\uFEFF"; // BOM for Excel UTF-8 compatibility
  const filename = `spendly-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
