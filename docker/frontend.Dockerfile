# DEVOPS-02 — frontend.Dockerfile
# Build context (see docker-compose.yml): ../frontend
# Containerizes frontend/ (FRONTEND-01/02). Uses next.config.mjs's
# `output: "standalone"` (added during DEPLOY-01's real-world load/perf
# pass, 2026-08-30) for a minimal runtime — traced dependencies only, no
# full node_modules in the final image.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* vars are inlined into the client bundle at build time,
# not read at container-run time — a docker-compose `environment:` entry
# alone does nothing for these. Must be passed as a build arg. Found
# during DEPLOY-01's first real end-to-end signup attempt (2026-08-30):
# the browser's fetch was silently going to the unpublished
# localhost:8000 fallback in lib/api/client.ts instead of nginx's :80.
ARG NEXT_PUBLIC_API_BASE_URL=/api/v1
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Standalone output (next.config.mjs's output: "standalone") traces only
# the files this app actually needs at runtime — no full node_modules
# copy, no dev dependencies, meaningfully smaller image and lower memory
# footprint than the previous `npm start`-based runner.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
