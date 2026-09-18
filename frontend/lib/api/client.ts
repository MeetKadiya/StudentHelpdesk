/**
 * Thin fetch wrapper for the FastAPI backend. All backend calls go through
 * here (coding_standards.md: "API calls centralized in frontend/lib/api/ —
 * components don't call fetch directly against backend routes").
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  // Browser execution
  if (typeof window !== "undefined") {
    // If not set, or relative path (e.g. "/api/v1"), route through Nginx reverse proxy
    if (!envUrl || envUrl.startsWith("/")) {
      return envUrl || "/api/v1";
    }
    // If baked as an absolute localhost/127.0.0.1 URL but accessing through Nginx
    // (potentially on a different port like 80/8080 or different hostname/IP),
    // always prefer relative "/api/v1" so the browser's requests stay same-origin.
    try {
      const parsed = new URL(envUrl);
      if (
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.host === window.location.host
      ) {
        return "/api/v1";
      }
    } catch {
      return "/api/v1";
    }
    return envUrl;
  }

  // Server-side execution (Node.js runtime / SSR)
  if (envUrl && envUrl.startsWith("http")) {
    return envUrl;
  }
  return process.env.INTERNAL_API_BASE_URL || "http://fastapi-backend:8000/api/v1";
}

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : "Request failed");
    this.status = status;
    this.detail = detail;
  }
}

interface ApiFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  accessToken?: string;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = "GET", body, accessToken } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const baseUrl = getApiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError(
        504,
        "Request timed out. The backend server on Render is likely waking up from standby (which takes 30-50s on free tier) or starting up. Please wait a few seconds and try again."
      );
    }
    throw new ApiError(
      503,
      "Cannot connect to the backend server. The service may still be deploying on Render or temporarily offline."
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let detail: unknown = `Request to ${path} failed with status ${response.status}`;
    try {
      const errorBody = await response.json();
      detail = errorBody?.detail ?? detail;
    } catch {
      // Response body wasn't JSON — keep the generic message above.
    }
    throw new ApiError(response.status, detail);
  }

  // 204 No Content or empty bodies — callers expecting a body shouldn't hit this.
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
