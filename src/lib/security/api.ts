import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";

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
  const inMemoryAllowed = checkInMemoryBucket(key, options);

  if (!inMemoryAllowed) {
    return false;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isProduction = process.env.NODE_ENV === "production";

  if (!supabaseUrl || !supabaseAnonKey) {
    return isProduction ? false : true;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_key: key,
      p_limit: options.limit,
      p_window_ms: options.windowMs,
    });

    if (error) {
      console.error("[rate-limit] DB RPC error", {
        keyPrefix: options.keyPrefix,
        code: error.code,
        message: error.message,
      });
      return isProduction ? false : true;
    }

    if (typeof data !== "boolean") {
      console.error("[rate-limit] DB RPC returned non-boolean result", {
        keyPrefix: options.keyPrefix,
        resultType: typeof data,
      });
      return isProduction ? false : true;
    }

    return data;
  } catch (error) {
    console.error("[rate-limit] DB RPC threw exception", {
      keyPrefix: options.keyPrefix,
      error: error instanceof Error ? error.message : String(error),
    });
    return isProduction ? false : true;
  }
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

export function withSecurityHeaders(init: ResponseInit = {}, rateLimitInfo?: { limit: number; remaining: number; resetAt: number }) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store, no-cache, max-age=0");
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );

  if (process.env.NODE_ENV === "production") {
    headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  if (rateLimitInfo) {
    headers.set("RateLimit-Limit", String(rateLimitInfo.limit));
    headers.set("RateLimit-Remaining", String(Math.max(0, rateLimitInfo.remaining)));
    headers.set("RateLimit-Reset", String(Math.ceil(rateLimitInfo.resetAt / 1000)));
  }

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

  if (!headerToken || !cookieToken) return false;

  // Timing-safe comparison prevents token enumeration via timing side-channel
  try {
    const a = Buffer.from(headerToken, "utf8");
    const b = Buffer.from(cookieToken, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
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
  const forwardedChains = [
    request.headers.get("x-vercel-forwarded-for"),
    request.headers.get("x-forwarded-for"),
  ];

  for (const chain of forwardedChains) {
    if (!chain) {
      continue;
    }

    const candidates = chain
      .split(",")
      .map((ip) => normalizeIp(ip))
      .filter((ip): ip is string => typeof ip === "string" && isIP(ip) !== 0);
    const publicFromRight = [...candidates].reverse().find(isPublicIp);

    if (publicFromRight) {
      return publicFromRight;
    }

    const rightMostValid = candidates.at(-1);
    if (rightMostValid) {
      return rightMostValid;
    }
  }

  const realIp = normalizeIp(request.headers.get("x-real-ip"));
  if (realIp && isIP(realIp) !== 0) {
    return realIp;
  }

  return "unknown";
}

function checkInMemoryBucket(key: string, options: RateLimitOptions) {
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

function normalizeIp(value: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("[") && trimmed.includes("]")) {
    return trimmed.slice(1, trimmed.indexOf("]"));
  }

  const colonCount = (trimmed.match(/:/g) ?? []).length;
  if (colonCount === 1 && trimmed.includes(".")) {
    return trimmed.split(":")[0] ?? null;
  }

  return trimmed;
}

function isPublicIp(ip: string) {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);

    if (
      a === 10 ||
      a === 0 ||
      a >= 224 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168)
    ) {
      return false;
    }

    return true;
  }

  if (isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    if (
      lower === "::1" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe8") ||
      lower.startsWith("fe9") ||
      lower.startsWith("fea") ||
      lower.startsWith("feb")
    ) {
      return false;
    }

    return true;
  }

  return false;
}
