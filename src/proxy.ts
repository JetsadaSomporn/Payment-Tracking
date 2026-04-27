import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// Short-lived session cache — avoids Supabase API roundtrip on every page load
// Reduces latency ~50-200ms per request while keeping security intact
const CACHE_TTL = 10_000;
const MAX_CACHE_ENTRIES = 5_000;
const sessionCache = new Map<string, number>();

function setSessionCache(key: string, value: number) {
  for (const [cachedKey, updatedAt] of sessionCache.entries()) {
    if (value - updatedAt > CACHE_TTL) {
      sessionCache.delete(cachedKey);
    }
  }

  if (sessionCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = sessionCache.keys().next().value;
    if (firstKey !== undefined) {
      sessionCache.delete(firstKey);
    }
  }
  sessionCache.set(key, value);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Bypass Auth Callback ────────────────────────────────────────────────
  if (pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csrfToken = crypto.randomUUID();
  const isDev = process.env.NODE_ENV === "development";

  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' https://cdn.jsdelivr.net 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    "img-src 'self' blob: data: https://*.googleusercontent.com",
    "font-src 'self'",
    `connect-src 'self' https://*.supabase.co https://*.nvidia.com https://cdn.jsdelivr.net https://tessdata.projectnaptha.com https://*.google.com`,
    "worker-src 'self' blob: https://cdn.jsdelivr.net",
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' https://*.supabase.co https://accounts.google.com`,
    "frame-ancestors 'none'",
    "frame-src 'self' https://*.google.com",
  ];

  if (!isDev) {
    cspDirectives.push("upgrade-insecure-requests");
  }

  const csp = cspDirectives.join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  requestHeaders.set("x-csrf-token", csrfToken);

  // ── Supabase Session Refresh (with cache) ───────────────────────────────
  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          applySecurityHeaders(supabaseResponse, csp, isDev);
          supabaseResponse.headers.set("x-nonce", nonce);
          supabaseResponse.headers.set("x-csrf-token", csrfToken);
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              path: "/",
              sameSite: "lax",
              httpOnly: shouldUseHttpOnly(name),
              secure: !isDev,
            }),
          );
        },
      },
    },
  );

  // ── Smart session refresh with cache ────────────────────────────────────
  // Only call Supabase API if the cached session is older than TTL
  const sbCookies = request.cookies.getAll().filter(c => c.name.includes("sb-"));
  const cookieFingerprint = sbCookies.map(c => `${c.name}=${c.value.slice(0, 20)}`).join("|");
  const cached = sessionCache.get(cookieFingerprint);

  if (!cached || Date.now() - cached > CACHE_TTL) {
    await supabase.auth.getUser();
    setSessionCache(cookieFingerprint, Date.now());
  }

  // ── Force cookie path fix on EVERY request ──────────────────────────────
  sbCookies.forEach(c => {
    supabaseResponse.cookies.set(c.name, c.value, {
      path: "/",
      sameSite: "lax",
      httpOnly: shouldUseHttpOnly(c.name),
      secure: !isDev,
    });
  });

  applySecurityHeaders(supabaseResponse, csp, isDev);
  supabaseResponse.cookies.set("csrf-token", csrfToken, {
    path: "/",
    sameSite: "strict",
    httpOnly: false, // must be JS-readable for double-submit CSRF pattern
    secure: !isDev,
  });

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

export { proxy as middleware };

function shouldUseHttpOnly(cookieName: string) {
  return cookieName.startsWith("sb-");
}

function applySecurityHeaders(
  response: NextResponse,
  csp: string,
  isDev: boolean,
) {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()",
  );

  if (!isDev) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
}
