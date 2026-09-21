"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

export function useRequireClerk() {
  const router = useRouter();
  const { accessToken, isAuthenticated, user, isUserLoading } = useAuth();

  useEffect(() => {
    if (isUserLoading) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (user && user.role !== "clerk" && user.role !== "admin") {
      if (user.role === "faculty") {
        router.push("/faculty");
      } else {
        router.push("/");
      }
    }
  }, [isAuthenticated, isUserLoading, user, router]);

  return accessToken;
}
