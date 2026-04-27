import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Bypass Auth Callback ────────────────────────────────────────────────
  // Prevent proxy/middleware from running getUser() which refreshes session 
  // using OLD cookies before the callback route can exchange the NEW code.
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

  // ── Supabase Session Refresh ──────────────────────────────────────────────
  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
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
          // 1. Update the underlying request cookies so downstream has them
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          
          // 2. Recreate the response to include updated request state
          supabaseResponse = NextResponse.next({
            request,
          });
          
          // 3. Re-apply custom security headers
          supabaseResponse.headers.set("x-nonce", nonce);
          supabaseResponse.headers.set("Content-Security-Policy", csp);
          supabaseResponse.headers.set("x-csrf-token", csrfToken);
          
          // 4. Force write cookies to response with browser-accessible settings
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              path: "/", // Force global path
              sameSite: "lax",
              httpOnly: false, // CRITICAL: Must be false for browser JS access
              secure: !isDev,
            }),
          );
        },
      },
    },
  );

  // This will refresh the session if it's expired
  await supabase.auth.getUser();

  // ── Force cookie path fix on EVERY request ───────────────────────────────
  // Supabase only calls setAll when tokens are expiring. If the session is
  // fresh, the original cookies (possibly without path="/") remain unchanged.
  // We must re-set them with path="/" on every request to prevent session loss
  // when navigating between pages.
  request.cookies.getAll()
    .filter(c => c.name.includes("sb-"))
    .forEach(c => {
      supabaseResponse.cookies.set(c.name, c.value, {
        path: "/",
        sameSite: "lax",
        httpOnly: false,
        secure: !isDev,
      });
    });

  supabaseResponse.headers.set("Content-Security-Policy", csp);
  supabaseResponse.cookies.set("csrf-token", csrfToken, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    secure: !isDev,
  });

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
