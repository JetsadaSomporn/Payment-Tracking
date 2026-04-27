import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csrfToken = crypto.randomUUID();
  const isDev = process.env.NODE_ENV === "development";

  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' https://cdn.jsdelivr.net 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self' https://*.supabase.co https://*.nvidia.com https://cdn.jsdelivr.net https://tessdata.projectnaptha.com`,
    "worker-src 'self' blob: https://cdn.jsdelivr.net",
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' https://*.supabase.co https://accounts.google.com`,
    "frame-ancestors 'none'",
  ];

  if (!isDev) {
    cspDirectives.push("upgrade-insecure-requests");
  }

  const csp = cspDirectives.join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  requestHeaders.set("x-csrf-token", csrfToken);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  // ── Supabase Session Refresh ──────────────────────────────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // This will refresh the session if it's expired
  await supabase.auth.getUser();

  response.headers.set("Content-Security-Policy", csp);
  response.headers.append(
    "Set-Cookie",
    `csrf-token=${csrfToken}; Path=/; SameSite=Strict;${isDev ? "" : " Secure"}`,
  );

  return response;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
