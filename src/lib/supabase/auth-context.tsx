"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { createClient } from "./client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  display_name: string;
  is_admin: boolean;
  xp: number;
  torah_points: number;
  wisdom_coins: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  earned_badges: string[];
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Record<string, unknown>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const supabase = createClient();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string, retryCount = 0) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) {
      console.warn("fetchProfile failed:", error?.message || "no data", "retry:", retryCount);
      // Retry once after 2 seconds
      if (retryCount < 2) {
        await new Promise((r) => setTimeout(r, 2000));
        return fetchProfile(userId, retryCount + 1);
      }
      return;
    }

    // If display_name is empty, try to fill it from Google user metadata
    if (!data.display_name || data.display_name === "") {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        const meta = authUser?.user_metadata;
        const googleName = meta?.full_name || meta?.name || meta?.display_name || "";
        if (googleName) {
          await supabase
            .from("profiles")
            .update({ display_name: googleName, updated_at: new Date().toISOString() })
            .eq("id", userId);
          data.display_name = googleName;
        }
      } catch {
        // Not critical, continue
      }
    }

    setProfile(data as Profile);
  }, []);

  useEffect(() => {
    // Safety timeout: never stay loading for more than 5 seconds
    const timeout = setTimeout(() => setLoading(false), 5000);

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      try {
        if (s?.user) await fetchProfile(s.user.id);
      } catch { /* profile fetch failed, continue */ }
      clearTimeout(timeout);
      setLoading(false);
    }).catch(() => {
      clearTimeout(timeout);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          await fetchProfile(s.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      // Use custom API that auto-confirms (no email verification needed)
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        return { error: data.error || "שגיאה בהרשמה" };
      }
      // Auto-login after successful signup
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) return { error: signInError.message };
      return {};
    } catch {
      return { error: "שגיאה בהרשמה, נסה שוב" };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) {
        console.error("Google OAuth error:", error.message);
        alert("שגיאה בכניסה עם Google: " + error.message);
      } else if (data?.url) {
        // Manually redirect (fallback if auto-redirect doesn't work on mobile)
        window.location.href = data.url;
      }
    } catch (e) {
      console.error("Google OAuth exception:", e);
      alert("שגיאה בכניסה עם Google");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const updateProfile = async (data: Record<string, unknown>) => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    await fetchProfile(user.id);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, signUp, signIn, signInWithGoogle, signOut, updateProfile, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
