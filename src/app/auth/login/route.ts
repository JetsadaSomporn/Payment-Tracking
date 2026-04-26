import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const { protocol, host } = new URL(request.url);
  const siteUrl = `${protocol}//${host}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data?.url) {
    return NextResponse.redirect(data.url);
  }

  return NextResponse.json({ error: "Could not generate auth URL" }, { status: 500 });
}
