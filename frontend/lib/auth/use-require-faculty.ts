"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

/**
 * Same shape as use-require-auth.ts's guard, plus a role check. Faculty
 * routes need both: not-logged-in -> /login, logged-in-but-wrong-role ->
 * away from the faculty area entirely (redirects to /tickets rather than
 * showing an empty/broken faculty UI to a student). Kept as its own hook
 * instead of adding a `role` param to useRequireAuth, since a wrong-role
 * redirect target isn't the same for every future role-gated area (e.g.
 * an eventual admin guard would redirect elsewhere) — see
 * state_claude3.md if this pattern gets reused a third time, that's the
 * point to extract a shared parametrized version.
 *
 * user/isUserLoading come from GET /auth/me (auth-context.tsx's
 * FRONTEND-04 addition) — role is genuinely unknown (not just "false")
 * until that resolves, so this waits for isUserLoading to settle before
 * redirecting on role, to avoid a flash-redirect for a legitimate faculty
 * user whose /auth/me call just hasn't returned yet.
 */
export function useRequireFaculty() {
  const router = useRouter();
  const { accessToken, isAuthenticated, user, isUserLoading } = useAuth();

  useEffect(() => {
    if (isUserLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (user) {
      if (user.role === "student") {
        router.push("/");
      } else if (user.role === "clerk") {
        router.push("/clerk");
      } else if (user.role !== "faculty" && user.role !== "admin") {
        router.push("/");
      }
    }
  }, [isAuthenticated, isUserLoading, user, router]);

  return accessToken;
}
