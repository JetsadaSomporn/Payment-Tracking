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
    let cancelled = false;
    let retryCount = 0;
    const maxRetries = 3;

    const supabase = getBrowserSupabaseClient();
    if (!supabase) {
      setIsLoading(false);
      setAuthLabel("Supabase ไม่พร้อมใช้งาน");
      return;
    }

    // Initial check with retry
    const initAuth = async () => {
      while (retryCount < maxRetries) {
        try {
          const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error("[auth-provider] getSession error:", sessionError.message);
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise(r => setTimeout(r, 1000 * retryCount));
              continue;
            }
          }

          if (!cancelled && initialSession) {
            setSession(initialSession);
            setUser(initialSession.user);
            const email = initialSession.user.email;
            const meta = initialSession.user.user_metadata as Record<string, unknown> | null;
            setAuthLabel(email ?? "Logged in");
            setUserMeta(meta && (meta.full_name || meta.avatar_url) ? meta as { full_name?: string; avatar_url?: string } : null);
            console.log("[auth-provider] session loaded:", { email, hasMeta: !!meta });
          } else if (!cancelled) {
            console.log("[auth-provider] no session found on init");
          }
          break;
        } catch (err) {
          console.error("[auth-provider] init error:", err);
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(r => setTimeout(r, 1000 * retryCount));
          }
        }
      }
      
      if (!cancelled) setIsLoading(false);
    };

    initAuth();

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, currentSession: Session | null) => {
        if (cancelled) return;
        console.log("[auth-provider] state change:", event, !!currentSession);
        
        if (event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
          setAuthLabel("ยังไม่ได้ login");
          setUserMeta(null);
          setIsLoading(false);
          return;
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          const email = currentSession.user.email;
          const meta = currentSession.user.user_metadata as Record<string, unknown> | null;
          setAuthLabel(email ?? "Logged in");
          setUserMeta(meta && (meta.full_name || meta.avatar_url) ? meta as { full_name?: string; avatar_url?: string } : null);
        } else {
          setAuthLabel("ยังไม่ได้ login");
          setUserMeta(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      cancelled = true;
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
