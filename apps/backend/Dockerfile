# syntax=docker/dockerfile:1
#
# QRcodly backend (Fastify) image — for Kubernetes. Coolify keeps building with Nixpacks
# (nixpacks.toml); this file does not affect it.
#
# Build context is the repository root (the backend needs packages/shared and packages/db):
#   docker build -f apps/backend/Dockerfile -t qrcodly-backend .
#
# One image for every environment: nothing environment-specific is baked in, all settings and
# secrets come in as environment variables at runtime (see apps/backend/.env.example).
#
#   API server:  node build/src/index.js                         (default command)
#   Migrations:  node build/src/core/db/migrate.js               (with DB_MIGRATING=true)
#   CLI:         node build/src/cli.js <command>
# Migrations are NOT run on start (unlike `pnpm start`): with several replicas they would race.
# In Kubernetes a Job runs them once per rollout, before the new pods start.

ARG NODE_IMAGE=node:24.21.0-bookworm-slim
ARG PNPM_VERSION=11.13.1

# ── base ─────────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS base
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app
# Only the manifests: the dependency layers below are cached until one of them changes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY apps/backend/package.json apps/backend/

# ── build ────────────────────────────────────────────────────────────────────
FROM base AS build
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter "@apps/backend..."
COPY packages ./packages
COPY apps/backend ./apps/backend
# Workspace packages first (the backend compiles against their dist/), then the backend.
# SKIP_ENV_VALIDATION: the build script loads the env schema once; secrets only exist at runtime.
RUN cd packages/shared && pnpm exec tsc \
 && cd ../db && pnpm exec tsc \
 && cd ../../apps/backend && SKIP_ENV_VALIDATION=true pnpm run build

# ── production dependencies ──────────────────────────────────────────────────
# Same lockfile, without devDependencies (TypeScript, Jest, drizzle-kit …).
# Runs on the target platform: sharp and resvg ship native binaries per CPU.
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter "@apps/backend..."

# ── runtime ──────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE}

# Debian security fixes that landed after the pinned base image was built (the Grype gate in
# .github/workflows/container.yml fails on fixable Critical findings)
RUN apt-get update \
 && apt-get upgrade -y --no-install-recommends \
 && rm -rf /var/lib/apt/lists/*

# NODE_PATH: packages/db declares drizzle-orm only as a peer (+ devDependency), so a production
# install leaves packages/db/node_modules without it. Node then falls back to the backend's own
# copy — the same instance the backend queries with.
ENV NODE_ENV=production \
    TZ=Europe/Berlin \
    API_HOST=0.0.0.0 \
    API_PORT=5001 \
    NODE_PATH=/app/apps/backend/node_modules

WORKDIR /app
# Monorepo layout is kept: the compiled backend reaches packages/*/dist through node_modules
COPY --from=prod-deps /app ./
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/db/dist ./packages/db/dist
COPY --from=build /app/apps/backend/build ./apps/backend/build
# The migrator reads the SQL files from ./src/core/db/migrations (relative to apps/backend)
COPY --from=build /app/apps/backend/src/core/db/migrations ./apps/backend/src/core/db/migrations

WORKDIR /app/apps/backend
# Unprivileged, numeric uid ("node" in the base image) so Kubernetes' runAsNonRoot can verify it.
# The image works with a read-only root filesystem; only /tmp needs to be writable.
USER 1000
EXPOSE 5001
CMD ["node", "build/src/index.js"]
