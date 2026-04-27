import { processSlipImage } from "@/lib/ai/slip-extraction";
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

  if (!(file instanceof File)) {
    return jsonError("file is required", 400);
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
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "image/jpeg";
    
    // Call the new unified function that uses Vision -> DeepSeek
    slip = await processSlipImage(base64Data, mimeType);
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
