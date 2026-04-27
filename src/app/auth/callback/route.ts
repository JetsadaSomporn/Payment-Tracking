import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";
  const host = request.headers.get("host");

  // ── Production Debug Logs ───────────────────────────────────────────────
  console.log("[auth-callback] hit", { 
    origin, 
    host,
    hasCode: !!code,
    next 
  });

  if (!code) {
    console.error("[auth-callback] error: missing code");
    return NextResponse.redirect(`${origin}/app?auth_error=missing_code`);
  }

  const supabase = await createSupabaseServerClient();
  
  // Exchange code
  const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("[auth-callback] exchange error:", exchangeError.message);
    return NextResponse.redirect(`${origin}/app?auth_error=${encodeURIComponent(exchangeError.message)}`);
  }

  // Verify user immediately after exchange
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  // Debug cookies after exchange
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  
  console.log("[auth-callback] exchange result", {
    exchangeSuccess: !!exchangeData.session,
    hasUser: !!user,
    userError: userError?.message || null,
    cookiesSet: allCookies.map(c => c.name).filter(n => n.includes('sb-'))
  });

  console.log("[auth-callback] final redirect to:", next);
  const response = NextResponse.redirect(`${origin}${next}`);
  
  // Guarantee cookies are transferred to the redirect response
  allCookies.forEach(c => {
    if (c.name.startsWith('sb-')) {
      response.cookies.set(c.name, c.value, {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV !== 'development',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
    }
  });

  return response;
}
