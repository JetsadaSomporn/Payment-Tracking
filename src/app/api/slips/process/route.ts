import { extractSlipTextWithNvidiaDeepSeek } from "@/lib/ai/slip-extraction";
import {
  checkRateLimit,
  jsonError,
  jsonOk,
  requireCsrfToken,
  requireSameOrigin,
} from "@/lib/security/api";
import {
  validateSlipFileMetadata,
  validateSlipFileSignature,
} from "@/lib/security/upload";
import { requireAuthenticatedUser } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!requireSameOrigin(request)) {
    return jsonError("forbidden origin", 403);
  }

  if (!requireCsrfToken(request)) {
    return jsonError("invalid csrf token", 403);
  }

  if (
    !(await checkRateLimit(request, {
      keyPrefix: "slip-process",
      limit: 20,
      windowMs: 60_000,
    }))
  ) {
    return jsonError("too many requests", 429);
  }

  const auth = await requireAuthenticatedUser(request);

  if (!auth.ok) {
    return jsonError(auth.error, auth.status);
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const rawText = formData.get("rawText");

  if (!(file instanceof File)) {
    return jsonError("file is required", 400);
  }

  if (typeof rawText !== "string" || rawText.trim().length < 5) {
    return jsonError("OCR text is required", 400);
  }

  if (new TextEncoder().encode(rawText).byteLength > 64 * 1024) {
    return jsonError("OCR text is too large", 400);
  }

  const metadataError = validateSlipFileMetadata(file);

  if (metadataError) {
    return jsonError(metadataError, 400);
  }

  const signatureError = await validateSlipFileSignature(file);

  if (signatureError) {
    return jsonError(signatureError, 400);
  }

  let slip;

  try {
    slip = await extractSlipTextWithNvidiaDeepSeek(rawText.trim());
  } catch (error) {
    const message = error instanceof Error ? error.message : "slip extraction failed";
    return jsonError(message, 502);
  }

  return jsonOk({
    ok: true,
    userId: auth.user.id,
    provider: "nvidia",
    slip,
  });
}
