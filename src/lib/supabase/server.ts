import { createClient } from "@supabase/supabase-js";

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

  const token = readBearerToken(request);


  if (!token) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  const supabase = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

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
