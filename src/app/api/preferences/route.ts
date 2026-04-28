import { checkRateLimit, jsonError, jsonOk, requireSameOrigin, requireCsrfToken } from "@/lib/security/api";
import { createAuthenticatedSupabaseClient, requireAuthenticatedUser } from "@/lib/supabase/server";

/**
 * GET  /api/preferences — read user preferences
 * PATCH /api/preferences — merge new preferences
 *
 * Stored as JSONB in profiles.preferences column.
 * Keys: aiModel, aiConfidence, autoCategorize, reducedMotion
 */

export async function GET(request: Request) {
  if (!(await checkRateLimit(request, { keyPrefix: "preferences", limit: 30, windowMs: 60_000 }))) {
    return jsonError("too many requests", 429);
  }

  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  if (!auth.accessToken) return jsonError("unauthorized", 401);

  const supabase = createAuthenticatedSupabaseClient(auth.accessToken);
  const { data, error } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", auth.user.id)
    .single();

  if (error) {
    console.error("[preferences:GET] supabase error", { code: error.code, message: error.message });
    return jsonError("preferences load failed", 500);
  }

  return jsonOk({ ok: true, preferences: data.preferences ?? {} });
}

export async function PATCH(request: Request) {
  if (!requireSameOrigin(request)) return jsonError("forbidden origin", 403);
  if (!requireCsrfToken(request)) return jsonError("invalid csrf token", 403);

  if (!(await checkRateLimit(request, { keyPrefix: "preferences-write", limit: 20, windowMs: 60_000 }))) {
    return jsonError("too many requests", 429);
  }

  const auth = await requireAuthenticatedUser(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  if (!auth.accessToken) return jsonError("unauthorized", 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError("invalid json", 400);
  }

  // Whitelist allowed preference keys
  const ALLOWED_KEYS = ["aiModel", "aiConfidence", "autoCategorize", "reducedMotion"];
  const updates: Record<string, unknown> = {};

  for (const key of ALLOWED_KEYS) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return jsonError("no valid preferences to update", 400);
  }

  // Validate types
  if ("aiConfidence" in updates && (typeof updates.aiConfidence !== "number" || updates.aiConfidence < 0 || (updates.aiConfidence as number) > 1)) {
    return jsonError("aiConfidence must be a number between 0 and 1", 400);
  }
  if ("autoCategorize" in updates && typeof updates.autoCategorize !== "boolean") {
    return jsonError("autoCategorize must be a boolean", 400);
  }
  if ("reducedMotion" in updates && typeof updates.reducedMotion !== "boolean") {
    return jsonError("reducedMotion must be a boolean", 400);
  }
  if ("aiModel" in updates && typeof updates.aiModel !== "string") {
    return jsonError("aiModel must be a string", 400);
  }

  const supabase = createAuthenticatedSupabaseClient(auth.accessToken);

  // Fetch current preferences to merge
  const { data: current, error: fetchError } = await supabase
    .from("profiles")
    .select("preferences")
    .eq("id", auth.user.id)
    .single();

  if (fetchError) {
    console.error("[preferences:PATCH] fetch error", { code: fetchError.code });
    return jsonError("preferences fetch failed", 500);
  }

  const merged = { ...(current?.preferences ?? {}), ...updates };

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ preferences: merged })
    .eq("id", auth.user.id);

  if (updateError) {
    console.error("[preferences:PATCH] update error", { code: updateError.code, message: updateError.message });
    return jsonError("preferences save failed", 500);
  }

  return jsonOk({ ok: true, preferences: merged });
}
