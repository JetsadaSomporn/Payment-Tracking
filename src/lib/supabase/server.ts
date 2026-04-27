import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
};

type AuthResult =
  | {
      ok: true;
      user: AuthenticatedUser;
      mode: "supabase" | "local-dev";
      accessToken: string | null;
    }
  | { ok: false; status: number; error: string };

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                path: "/",
                sameSite: "lax",
                httpOnly: false,
              })
            );
          } catch {
            // ignore — called from Server Component where cookies are read-only
          }
        },
      },
    },
  );
}

export async function requireAuthenticatedUser(
  request: Request,
): Promise<AuthResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return {
      ok: false,
      status: 503,
      error: "Supabase service is not configured correctly",
    };
  }

  // 1. Try Bearer token first (for API calls from frontend)
  const token = readBearerToken(request);
  if (token) {
    const supabase = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const { data, error } = await supabase.auth.getUser(token);

    if (!error && data.user) {
      return {
        ok: true,
        mode: "supabase",
        accessToken: token,
        user: {
          id: data.user.id,
          email: data.user.email ?? null,
        },
      };
    }
  }

  // 2. Fallback to session cookies (for direct browser navigation or SSR)
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  const { data: { session } } = await supabase.auth.getSession();

  return {
    ok: true,
    mode: "supabase",
    accessToken: session?.access_token ?? null,
    user: {
      id: user.id,
      email: user.email ?? null,
    },
  };
}

export function createAuthenticatedSupabaseClient(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase env is not configured");
  }

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  if (scheme.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}
