import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

/**
 * POST /api/auth/signout
 *
 * Server-side sign-out that clears HttpOnly Supabase auth cookies
 * and redirects to the landing page.
 *
 * Called by client after supabase.auth.signOut() to complete
 * double-sided session termination — client clears localStorage,
 * server clears HttpOnly cookies.
 */
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const response = NextResponse.redirect(new URL("/", origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name }) => {
            response.cookies.set(name, "", {
              path: "/",
              maxAge: 0,
              sameSite: "lax",
              httpOnly: name.startsWith("sb-"),
              secure: process.env.NODE_ENV !== "development",
            });
          });
        },
      },
    },
  );

  // Destroy session on Supabase
  await supabase.auth.signOut();

  // Belt-and-suspenders: explicitly clear all known Supabase cookie patterns
  const cookieNames = [
    "sb-access-token",
    "sb-refresh-token",
    "sb-provider-token",
    "sb-auth-token",
    "csrf-token",
  ];

  cookieNames.forEach((name) => {
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
    response.cookies.set(name, "", { path: "/", maxAge: 0, httpOnly: true, secure: process.env.NODE_ENV !== "development", sameSite: "lax" });
  });

  return response;
}
