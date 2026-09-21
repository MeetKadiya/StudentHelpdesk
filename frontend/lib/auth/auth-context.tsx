"use client";

/**
 * Client-side auth state. Tokens are kept in React state + localStorage for
 * this FRONTEND-01 scaffold. This is a deliberate, flagged simplification —
 * NOT a final security decision: localStorage is readable by any script on
 * the page (XSS risk). A production hardening pass (httpOnly cookies set by
 * the backend, or a proper session strategy) should go through
 * task_board.md as its own task rather than being silently upgraded later.
 * See state_claude3.md "Current Architecture Decisions".
 *
 * FRONTEND-04 addition: role/email are now tracked too, via GET /auth/me
 * (api_contract.md v0.10) — needed so the UI can tell student/faculty/
 * admin apart after login. Fetched once after login/signup and once on
 * hydrate from localStorage; not persisted itself (re-derived from the
 * token each time, so a role change server-side is picked up on next load
 * rather than trusting a stale cached value).
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { login as apiLogin, signup as apiSignup, getMe, refresh, type TokenResponse, type UserOut } from "@/lib/api/auth";

const STORAGE_KEY = "helpdesk_auth";

interface StoredAuth {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  user: UserOut | null;
  isUserLoading: boolean;
  login: (email: string, password: string) => Promise<UserOut>;
  signup: (
    email: string,
    password: string,
    role?: "student" | "faculty" | "admin" | "clerk"
  ) => Promise<UserOut>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserOut | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const stored = readStoredAuth();
    if (stored && stored.accessToken) {
      setAccessToken(stored.accessToken);
      setRefreshToken(stored.refreshToken);
      getMe(stored.accessToken)
        .then((me) => {
          if (!cancelled) {
            setUser(me);
            setIsUserLoading(false);
          }
        })
        .catch(async () => {
          // Token invalid or expired: attempt refresh if refresh token exists
          if (stored.refreshToken) {
            try {
              const newTokens = await refresh(stored.refreshToken);
              if (!cancelled) {
                persist(newTokens);
                const me = await getMe(newTokens.access_token);
                setUser(me);
                setIsUserLoading(false);
                return;
              }
            } catch {
              // Refresh token is also invalid or expired
            }
          }
          // Purge corrupted/expired tokens from storage so user is not stuck in half-authed state
          if (!cancelled) {
            persist(null);
            setUser(null);
            setIsUserLoading(false);
          }
        });
    } else {
      setIsUserLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  function persist(tokens: TokenResponse | null) {
    if (tokens) {
      setAccessToken(tokens.access_token);
      setRefreshToken(tokens.refresh_token);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token })
        );
      }
    } else {
      setAccessToken(null);
      setRefreshToken(null);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  async function login(email: string, password: string): Promise<UserOut> {
    setIsUserLoading(true);
    try {
      const tokens = await apiLogin(email, password);
      persist(tokens);
      const me = await getMe(tokens.access_token);
      setUser(me);
      return me;
    } finally {
      setIsUserLoading(false);
    }
  }

  async function signup(
    email: string,
    password: string,
    role: "student" | "faculty" | "admin" | "clerk" = "student"
  ): Promise<UserOut> {
    await apiSignup(email, password, role);
    return await login(email, password);
  }

  function logout() {
    setUser(null);
    persist(null);
  }

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        refreshToken,
        isAuthenticated: Boolean(accessToken && user),
        user,
        isUserLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
