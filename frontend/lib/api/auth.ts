/**
 * Auth API calls. Shapes match backend/app/schemas/auth.py and
 * project-management/api_contract.md v0.4 — keep these two in sync; if the
 * backend contract changes, update both places in the same session.
 */
import { apiFetch } from "@/lib/api/client";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserOut {
  id: string;
  email: string;
  role: string;
}

// Added alongside FRONTEND-04 (api_contract.md v0.10) — access tokens
// only ever encode `sub` (see backend/app/core/security.py), so there was
// previously no way to know a logged-in user's role at all.
export function getMe(accessToken: string): Promise<UserOut> {
  return apiFetch<UserOut>("/auth/me", { accessToken });
}

export function signup(
  email: string,
  password: string,
  role: "student" | "faculty" | "admin" = "student"
): Promise<UserOut> {
  return apiFetch<UserOut>("/auth/signup", {
    method: "POST",
    body: { email, password, role },
  });
}

export function login(email: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function refresh(refreshToken: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
  });
}
