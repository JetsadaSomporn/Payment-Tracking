"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  authLabel: string;
  userMeta: { full_name?: string; avatar_url?: string } | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authLabel, setAuthLabel] = useState("ยังไม่ได้ login");
  const [userMeta, setUserMeta] = useState<{ full_name?: string; avatar_url?: string } | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // Initial check
    const initAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          setAuthLabel(initialSession.user.email ?? "Logged in");
          setUserMeta(initialSession.user.user_metadata as any);
        }
      } catch (err) {
        console.error("[auth-provider] init error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, currentSession: Session | null) => {
      console.log("[auth-provider] state change:", event);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setAuthLabel(currentSession?.user?.email ?? "ยังไม่ได้ login");
      setUserMeta(currentSession?.user?.user_metadata as any ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isLoading, authLabel, userMeta }}>
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
