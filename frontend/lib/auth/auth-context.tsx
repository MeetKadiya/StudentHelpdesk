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
import { login as apiLogin, signup as apiSignup, getMe, type TokenResponse, type UserOut } from "@/lib/api/auth";

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
  const [isUserLoading, setIsUserLoading] = useState(false);

  useEffect(() => {
    const stored = readStoredAuth();
    if (stored) {
      setAccessToken(stored.accessToken);
      setRefreshToken(stored.refreshToken);
    }
  }, []);

  // Fetch /auth/me whenever accessToken changes (login, signup, or
  // hydration from storage) — separate from persist() so a hydrated token
  // gets its role resolved too, not just a fresh login.
  useEffect(() => {
    if (!accessToken) {
      setUser(null);
      return;
    }
    let cancelled = false;
    setIsUserLoading(true);
    getMe(accessToken)
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        // Token invalid/expired — leave user null; useRequireAuth-style
        // guards already redirect on isAuthenticated, this just means
        // role-aware UI won't render until a fresh login.
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsUserLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  function persist(tokens: TokenResponse | null) {
    if (tokens) {
      setAccessToken(tokens.access_token);
      setRefreshToken(tokens.refresh_token);
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token })
      );
    } else {
      setAccessToken(null);
      setRefreshToken(null);
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  async function login(email: string, password: string): Promise<UserOut> {
    const tokens = await apiLogin(email, password);
    persist(tokens);
    const me = await getMe(tokens.access_token);
    setUser(me);
    return me;
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
    persist(null);
  }

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        refreshToken,
        isAuthenticated: accessToken !== null,
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
