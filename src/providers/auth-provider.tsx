"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type AuthUser = {
  id: string;
  email: string | null;
};

type AuthUserMeta = { full_name?: string; avatar_url?: string } | null;

type AuthContextType = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authLabel: string;
  userMeta: AuthUserMeta;
};

type AuthSessionResponse =
  | {
      ok: true;
      authenticated: false;
    }
  | {
      ok: true;
      authenticated: true;
      user: {
        id: string;
        email: string | null;
        userMeta: AuthUserMeta;
      };
    }
  | {
      ok: false;
      error?: string;
    };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authLabel, setAuthLabel] = useState("ยังไม่ได้ login");
  const [userMeta, setUserMeta] = useState<AuthUserMeta>(null);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = (await res.json()) as AuthSessionResponse;

      if (!res.ok || !data.ok || !data.authenticated) {
        setUser(null);
        setIsAuthenticated(false);
        setAuthLabel("ยังไม่ได้ login");
        setUserMeta(null);
        return;
      }

      setUser({ id: data.user.id, email: data.user.email });
      setIsAuthenticated(true);
      setAuthLabel(data.user.email ?? "Logged in");
      setUserMeta(data.user.userMeta);
    } catch (error) {
      console.error("[auth-provider] session check failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      setUser(null);
      setIsAuthenticated(false);
      setAuthLabel("ยังไม่ได้ login");
      setUserMeta(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, isLoading, authLabel, userMeta }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
