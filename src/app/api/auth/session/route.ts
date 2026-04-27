import { checkRateLimit, jsonError, jsonOk } from "@/lib/security/api";
import { requireAuthenticatedUser } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (
    !(await checkRateLimit(request, {
      keyPrefix: "auth-session",
      limit: 90,
      windowMs: 60_000,
    }))
  ) {
    return jsonError("too many requests", 429);
  }

  const auth = await requireAuthenticatedUser(request);

  if (!auth.ok) {
    if (auth.status === 401) {
      return jsonOk({ ok: true, authenticated: false });
    }

    return jsonError(auth.error, auth.status);
  }

  return jsonOk({
    ok: true,
    authenticated: true,
    user: {
      id: auth.user.id,
      email: auth.user.email,
      userMeta: auth.user.userMeta,
    },
  });
}
