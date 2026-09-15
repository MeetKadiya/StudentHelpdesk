"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useRequireAuth } from "@/lib/auth/use-require-auth";

/**
 * FRONTEND-04 addition — client-side companion to the backend's
 * require_role() (backend/app/api/deps.py). This is NOT the security
 * boundary (the backend enforces that on every request regardless); it
 * only prevents a logged-in student from momentarily seeing a faculty
 * page's shell before the API calls inside it 403. Redirects to "/" if
 * the resolved role doesn't match, once role has actually loaded
 * (isUserLoading false) — redirecting while still loading would bounce a
 * legitimate faculty user before /auth/me has even resolved.
 *
 * Takes a single space-separated string rather than a rest array so the
 * effect's dependency list can stay stable across renders — a fresh
 * array literal on every call (`...roles`) would otherwise re-run the
 * effect (and re-issue router.push) every render.
 */
export function useRequireRole(allowedRoles: string) {
  const router = useRouter();
  const accessToken = useRequireAuth();
  const { user, isUserLoading } = useAuth();

  useEffect(() => {
    if (!accessToken || isUserLoading) return;
    if (user && !allowedRoles.split(" ").includes(user.role)) {
      router.push("/");
    }
  }, [accessToken, isUserLoading, user, allowedRoles, router]);

  return { accessToken, user, isReady: !isUserLoading && user !== null };
}
