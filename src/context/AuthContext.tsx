import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase, UserProfile, Session } from "@/lib/supabase";
import type { SignUpUserData, SupabaseError } from "@/types";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";

interface AuthContextType {
  user: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: SupabaseError | null }>;
  signUp: (
    email: string,
    password: string,
    userData: SignUpUserData,
  ) => Promise<{ error: unknown; user: unknown }>;
  signOut: () => Promise<void>;
  updateUser: (data: Partial<UserProfile>) => Promise<{ error: SupabaseError | null }>;
  fetchUserProfile: (userId: string) => Promise<UserProfile | null>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_LOAD_TIMEOUT_MS = 5000;

const withProfileTimeout = async <T,>(promise: Promise<T>): Promise<T | null> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => resolve(null), PROFILE_LOAD_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isSupabaseConfigured = IS_SUPABASE_CONFIGURED;

  const buildFallbackUser = (sessionUser: {
    id: string;
    email?: string;
    user_metadata?: Record<string, string>;
  }): UserProfile => ({
    id: sessionUser.id,
    email: sessionUser.email || "",
    first_name: sessionUser.user_metadata?.first_name || "User",
    middle_name: sessionUser.user_metadata?.middle_name || "",
    last_name: sessionUser.user_metadata?.last_name || "",
    phone: sessionUser.user_metadata?.phone || "",
    role: (sessionUser.user_metadata?.role as "citizen" | "staff" | "admin") || "citizen",
    is_verified: false,
    account_status: "active",
  });

  const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        const pgError = error as { code?: string; message: string; details?: string; hint?: string };
        console.error("Error fetching user profile:", {
          code: pgError.code,
          message: pgError.message,
          details: pgError.details,
          hint: pgError.hint,
          userId,
        });
        return null;
      }

      if (!data) {
        return null;
      }

      return data as UserProfile;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      const profile = await fetchUserProfile(session.user.id);
      setUser(profile);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      if (!isSupabaseConfigured) {
        if (!isMounted) return;
        setSession(null);
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const timeoutPromise = new Promise<{ data: { session: Session | null } }>((resolve) => {
          setTimeout(() => resolve({ data: { session: null } }), 15000);
        });

        const sessionPromise = supabase.auth.getSession();
        const {
          data: { session: currentSession },
        } = await Promise.race([sessionPromise, timeoutPromise]);

        if (!isMounted) return;

        setSession(currentSession);
        if (currentSession?.user) {
          const profile = await withProfileTimeout(fetchUserProfile(currentSession.user.id));
          if (!isMounted) return;
          setUser(profile ?? buildFallbackUser(currentSession.user));
        } else {
          setUser(null);
        }
      } catch (error) {
        if (!isMounted) return;
        setSession(null);
        setUser(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession: Session | null) => {
      setSession(newSession);
      if (newSession?.user) {
        setUser(buildFallbackUser(newSession.user));
        setTimeout(() => {
          void withProfileTimeout(fetchUserProfile(newSession.user.id)).then((profile) => {
            if (isMounted && profile) setUser(profile);
          });
        }, 0);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [isSupabaseConfigured]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, userData: SignUpUserData) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: userData },
    });
    return { error, user: data?.user };
  };

  const signOut = async () => {
    // Clear local state immediately so UI responds right away
    setUser(null);
    setSession(null);
    // Fire signOut in background with a 5s timeout — never block the UI
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error("signOut timeout")), 5000),
        ),
      ]);
    } catch {
      // Ignore — local state already cleared, user is logged out in the UI
    }
  };

  const updateUser = async (data: Partial<UserProfile>) => {
    const { error } = await supabase.auth.updateUser({ data });
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signIn,
        signUp,
        signOut,
        updateUser,
        fetchUserProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
