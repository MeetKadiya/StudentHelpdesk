"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

/**
 * Same pattern as use-require-faculty.ts, redirect target adjusted for the
 * admin area (-> /tickets, since a non-admin has no admin home to fall
 * back to either). Waits for isUserLoading to settle before redirecting on
 * role, same reasoning as the faculty guard: avoid a flash-redirect for a
 * legitimate admin whose /auth/me call just hasn't resolved yet.
 */
export function useRequireAdmin() {
  const router = useRouter();
  const { accessToken, isAuthenticated, user, isUserLoading } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (!isUserLoading && user && user.role !== "admin") {
      if (user.role === "faculty") {
        router.push("/faculty");
      } else {
        router.push("/");
      }
    }
  }, [isAuthenticated, isUserLoading, user, router]);

  return accessToken;
}
