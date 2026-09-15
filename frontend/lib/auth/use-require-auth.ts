"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

/**
 * Redirects to /login if the auth-context hasn't hydrated a token yet.
 * Auth state is read from localStorage on mount (see auth-context.tsx), so
 * there's a brief window where accessToken is null even for a logged-in
 * user — callers should treat accessToken === null as "not ready yet",
 * not necessarily "unauthenticated", until this effect has run.
 */
export function useRequireAuth() {
  const router = useRouter();
  const { accessToken, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  return accessToken;
}
