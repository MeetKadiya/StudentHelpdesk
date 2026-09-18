/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Traced-dependency output for docker/frontend.Dockerfile's runner stage
  // (copies .next/standalone + .next/static only, no full node_modules).
  // The Dockerfile has assumed this was already set since the 2026-08-30
  // load/perf pass; it wasn't actually here, which would silently break
  // `COPY --from=builder /app/.next/standalone` on a fresh build.
  output: "standalone",
  // Explicit even though Next defaults to compressing responses — makes
  // the intent visible next to the other perf settings here.
  compress: true,
  // Skips the `X-Powered-By: Next.js` header on every response — no
  // functional benefit, just a few saved bytes per request and one less
  // thing announcing framework/version to clients.
  poweredByHeader: false,
  async rewrites() {
    const backend = process.env.INTERNAL_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    if (backend && backend.startsWith("http")) {
      const cleanOrigin = backend.replace(/\/api\/v1\/?$/, "");
      return [
        {
          source: "/api/v1/:path*",
          destination: `${cleanOrigin}/api/v1/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
