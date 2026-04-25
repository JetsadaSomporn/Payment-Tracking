import { createClient } from "@supabase/supabase-js";

type RateLimitOptions = {
  keyPrefix: string;
  limit: number;
  windowMs: number;
};

const buckets = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  request: Request,
  options: RateLimitOptions,
): Promise<boolean> {
  const ip = getClientIp(request);
  const key = `${options.keyPrefix}:${ip}`;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await supabase.rpc("check_rate_limit", {
        p_key: key,
        p_limit: options.limit,
        p_window_ms: options.windowMs,
      });

      if (!error && typeof data === "boolean") {
        return data;
      }
    } catch {
      // Dev can fall back locally; production must not silently lose rate limits.
    }
  }

  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return true;
  }

  if (bucket.count >= options.limit) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export function jsonOk<T>(body: T, init?: ResponseInit) {
  return Response.json(body, withSecurityHeaders(init));
}

export function jsonError(
  error: string,
  status: number,
  init?: ResponseInit,
) {
  return Response.json(
    { ok: false, error },
    withSecurityHeaders({ ...init, status }),
  );
}

export function withSecurityHeaders(init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store, max-age=0");
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("X-Content-Type-Options", "nosniff");

  return { ...init, headers };
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return process.env.NODE_ENV !== "production";
  }

  const requestUrl = new URL(request.url);
  return origin === requestUrl.origin;
}

export function requireCsrfToken(request: Request): boolean {
  const headerToken = request.headers.get("x-csrf-token");
  const cookieToken = request.headers.get("cookie")
    ?.split(";")
    .map(c => c.trim())
    .find(c => c.startsWith("csrf-token="))
    ?.split("=")[1];

  if (!headerToken || !cookieToken) {
    return false;
  }

  return headerToken === cookieToken;
}

export async function readJsonBody(request: Request, maxBytes: number) {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return { ok: false as const, error: "content-type must be application/json" };
  }

  const rawBody = await request.text();
  const actualBytes = new TextEncoder().encode(rawBody).byteLength;

  if (actualBytes > maxBytes) {
    return { ok: false as const, error: "request body is too large" };
  }

  try {
    return { ok: true as const, value: JSON.parse(rawBody) as unknown };
  } catch {
    return { ok: false as const, error: "invalid json body" };
  }
}

export function getCsrfTokenFromCookie(request: Request): string | null {
  return request.headers.get("cookie")
    ?.split(";")
    .map(c => c.trim())
    .find(c => c.startsWith("csrf-token="))
    ?.split("=")[1] ?? null;
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "local";
}
