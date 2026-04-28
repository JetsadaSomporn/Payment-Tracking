import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  
  // This will trigger the setAll in createSupabaseServerClient 
  // which will clear the HttpOnly cookies by setting them with an expired date.
  await supabase.auth.signOut();
  
  return NextResponse.json({ ok: true });
}
