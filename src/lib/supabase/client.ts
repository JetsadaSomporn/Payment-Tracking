import { createBrowserClient } from "@supabase/ssr";

export function getBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  // Return a fresh client instance to ensure cookie sync is always correct on navigation
  return createBrowserClient(url, anonKey);
}
