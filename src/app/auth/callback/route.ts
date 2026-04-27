import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  console.log("Auth callback received:", { code: code ? "exists" : "missing", origin, next });

  if (!code) {
    console.error("Auth callback error: missing code");
    return NextResponse.redirect(`${origin}/app?auth_error=missing_code`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const errorMessage = error?.message || "unknown_error";
    console.error("Auth callback error during code exchange:", errorMessage);
    return NextResponse.redirect(`${origin}/app?auth_error=${encodeURIComponent(errorMessage)}`);
  }

  console.log("Auth callback success, redirecting to:", next);
  return NextResponse.redirect(`${origin}${next}`);
}
