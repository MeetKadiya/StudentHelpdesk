"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

/**
 * Route guard that ensures only Students can access student-specific pages
 * (attendance, fee history, exam results). Redirects faculty to /faculty
 * and administrators to /admin.
 */
export function useRequireStudent() {
  const router = useRouter();
  const { isAuthenticated, user, isUserLoading } = useAuth();

  useEffect(() => {
    if (isUserLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (user) {
      if (user.role === "faculty") {
        router.push("/faculty");
      } else if (user.role === "admin") {
        router.push("/admin");
      } else if (user.role === "clerk") {
        router.push("/clerk");
      }
    }
  }, [isAuthenticated, isUserLoading, user, router]);

  return { isAuthorized: user?.role === "student", isUserLoading };
}
