import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  // ── Production Debug Logs ───────────────────────────────────────────────
  console.log("[auth-callback] hit", { 
    origin, 
    hasCode: !!code,
    next 
  });

  if (!code) {
    console.error("[auth-callback] error: missing code");
    return NextResponse.redirect(`${origin}/app?auth_error=missing_code`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorMessage = error?.message || "unknown_error";
    console.error("[auth-callback] exchange error:", errorMessage);
    return NextResponse.redirect(`${origin}/app?auth_error=${encodeURIComponent(errorMessage)}`);
  }

  console.log("[auth-callback] success, redirecting to:", next);
  return NextResponse.redirect(`${origin}${next}`);
}
