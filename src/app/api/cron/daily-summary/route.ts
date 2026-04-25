import { jsonError, jsonOk } from "@/lib/security/api";

export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return jsonError("cron secret is not configured", 503);
  }

  const providedSecret = request.headers
    .get("authorization")
    ?.replace("Bearer ", "") ?? "";

  const expected = new TextEncoder().encode(expectedSecret);
  const provided = new TextEncoder().encode(providedSecret);

  // Timing-safe comparison — prevents secret disclosure via response timing
  const lengthsMatch = expected.byteLength === provided.byteLength;
  const paddedProvided = lengthsMatch
    ? provided
    : new Uint8Array(expected.byteLength);

  let mismatch = lengthsMatch ? 0 : 1;
  for (let i = 0; i < expected.byteLength; i++) {
    mismatch |= expected[i]! ^ paddedProvided[i]!;
  }

  if (mismatch !== 0) {
    return jsonError("unauthorized", 401);
  }

  return jsonOk({
    ok: true,
    message:
      "Cron route is wired. Supabase-backed summary generation comes after env setup.",
  });
}
