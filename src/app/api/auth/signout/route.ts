import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/auth/signout
 *
 * Server-side sign-out that reads request cookies to identify
 * the Supabase session, invalidates it, clears all sb-* HttpOnly
 * cookies, and redirects to the landing page.
 */
export async function POST(request: NextRequest) {
  // Build redirect response first — we'll attach cleared cookies to it
  const response = NextResponse.redirect(new URL("/", request.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Read all cookies from the incoming request so supabase-js
          // can identify which session to terminate
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // supabase.auth.signOut() calls this to clear cookies.
          // Clear each one by setting maxAge=0 on the redirect response.
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, "", {
              ...options,
              path: "/",
              maxAge: 0,
            });
          });
        },
      },
    },
  );

  // Terminate the session on Supabase — this invalidates the refresh token
  await supabase.auth.signOut();

  // Belt-and-suspenders: also find any sb-* cookies directly from the request
  // and expire them. This catches cookies that Supabase's signOut might miss.
  request.cookies.getAll().forEach((cookie) => {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set(cookie.name, "", {
        path: "/",
        maxAge: 0,
        sameSite: "lax" as const,
        httpOnly: true,
        secure: process.env.NODE_ENV !== "development",
      });
    }
  });

  // Clear CSRF token too
  response.cookies.set("csrf-token", "", {
    path: "/",
    maxAge: 0,
    sameSite: "strict" as const,
    httpOnly: false,
    secure: process.env.NODE_ENV !== "development",
  });

  return response;
}
