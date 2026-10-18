# syntax=docker/dockerfile:1
#
# QRcodly frontend (Next.js) image — for Kubernetes. Coolify keeps building with Nixpacks
# (`next start`); this file does not affect it.
#
# Build context is the repository root (the frontend needs packages/shared):
#   docker build -f apps/frontend/Dockerfile -t qrcodly-frontend \
#     --build-arg NEXT_PUBLIC_FRONTEND_URL=https://www.qrcodly.de … .
#
# NEXT_PUBLIC_* values are inlined into the bundle by `next build`, so they are build args, not
# runtime env: one image per environment (prod, staging — .github/workflows/container.yml).
# None of them is secret, they all end up in the browser. Server-only values (CLERK_SECRET_KEY,
# INTERNAL_API_SECRET, AXIOM_*, API_INTERNAL_URL) are read at runtime and never enter the image.
#
# The build fetches the API spec for the docs pages (src/lib/openapi.ts) — from OPENAPI_URL if
# set, otherwise from NEXT_PUBLIC_API_URL. That address must be reachable from the build.

ARG NODE_IMAGE=node:24.21.0-bookworm-slim
ARG PNPM_VERSION=11.13.1

# ── build ────────────────────────────────────────────────────────────────────
# Runs on the target platform (not $BUILDPLATFORM): the standalone output copies native
# packages (sharp for next/image) that must match the CPU the image runs on.
FROM ${NODE_IMAGE} AS build
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /app

# 1) Dependencies — own layer, cached until a manifest or the lockfile changes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
COPY packages/shared/package.json packages/shared/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY apps/frontend/package.json apps/frontend/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter "@apps/frontend..."

# 2) App build
COPY packages ./packages
COPY apps/frontend ./apps/frontend
RUN cd packages/shared && pnpm exec tsc

ARG NEXT_PUBLIC_FRONTEND_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SHORT_URL_DOMAIN
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_JS_URL=/__clerk-js/dist/clerk.browser.min.js
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT
ARG NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_MONTHLY
ARG NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_ANNUAL
ARG NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_MONTHLY_LEGACY
ARG NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_ANNUAL_LEGACY
ARG NEXT_PUBLIC_STRIPE_ADDON_DOMAIN_PRICE_ID_MONTHLY
ARG NEXT_PUBLIC_STRIPE_ADDON_DOMAIN_PRICE_ID_ANNUAL
ARG NEXT_PUBLIC_GOOGLE_API_KEY
ARG OPENAPI_URL

# SKIP_ENV_VALIDATION: the server-only secrets are not here at build time. The workflow checks
# the required NEXT_PUBLIC_* values before it starts the build.
ENV NEXT_TELEMETRY_DISABLED=1 \
    SKIP_ENV_VALIDATION=1 \
    NEXT_OUTPUT=standalone
RUN cd apps/frontend && pnpm run build

# ── runtime ──────────────────────────────────────────────────────────────────
# Only the standalone server (traced node_modules subset) + static assets.
FROM ${NODE_IMAGE}

# Debian security fixes that landed after the pinned base image was built (the Grype gate in
# .github/workflows/container.yml fails on fixable Critical findings)
RUN apt-get update \
 && apt-get upgrade -y --no-install-recommends \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app
# Monorepo: the standalone output mirrors the repository, the server lives in apps/frontend
COPY --from=build --chown=node:node /app/apps/frontend/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=build --chown=node:node /app/apps/frontend/public ./apps/frontend/public

WORKDIR /app/apps/frontend
# Next writes its fetch/image cache here. Pre-created and owned by `node`; with a read-only root
# filesystem mount an emptyDir over it. Regenerated ISR pages go to .next/server/route-cache
# (Next >= 16.3) — that subdirectory needs its own emptyDir, never .next/server itself.
RUN mkdir -p .next/cache && chown node:node .next/cache

# Unprivileged, numeric uid ("node" in the base image) so Kubernetes' runAsNonRoot can verify it
USER 1000
EXPOSE 3000
CMD ["node", "server.js"]
