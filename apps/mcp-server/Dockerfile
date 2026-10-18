# syntax=docker/dockerfile:1
#
# QRcodly MCP server image — for Kubernetes. Coolify keeps building with Nixpacks; this file does
# not affect it.
#
# Build context is the repository root (shared lockfile and TypeScript/ESLint configs):
#   docker build -f apps/mcp-server/Dockerfile -t qrcodly-mcp-server .
#
# One image for every environment; settings come in as environment variables (src/env.ts).
# The OpenAPI spec the tools are generated from is bundled (src/openapi.json).

ARG NODE_IMAGE=node:24.21.0-bookworm-slim
ARG PNPM_VERSION=11.13.1

# ── base ─────────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS base
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY apps/mcp-server/package.json apps/mcp-server/

# ── build ────────────────────────────────────────────────────────────────────
FROM base AS build
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter "@apps/mcp-server..."
COPY apps/mcp-server ./apps/mcp-server
RUN cd apps/mcp-server && pnpm run build

# ── production dependencies ──────────────────────────────────────────────────
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter "@apps/mcp-server..."

# ── runtime ──────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE}

# Debian security fixes that landed after the pinned base image was built (Grype gate in CI)
RUN apt-get update \
 && apt-get upgrade -y --no-install-recommends \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3002

WORKDIR /app
COPY --from=prod-deps /app ./
COPY --from=build /app/apps/mcp-server/build ./apps/mcp-server/build

WORKDIR /app/apps/mcp-server
# Unprivileged, numeric uid ("node" in the base image) so Kubernetes' runAsNonRoot can verify it
USER 1000
EXPOSE 3002
CMD ["node", "build/index.js"]
