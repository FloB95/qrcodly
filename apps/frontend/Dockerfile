# syntax=docker.io/docker/dockerfile:1

# ---------- base stage: Basis-Image mit Node und pnpm ----------
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable pnpm
WORKDIR /repo

# ---------- deps stage: Workspace-Abhängigkeiten in den Store laden (cachebar) ----------
FROM base AS deps
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json

# pnpm-Store in ein eigenes Verzeichnis legen
RUN pnpm config set store-dir /pnpm-store
# Nur die Abhängigkeiten installieren (populiert den Store)
RUN pnpm install --frozen-lockfile

# ---------- builder stage: Vollständigen Code kopieren und 'frontend' bauen ----------
FROM base AS builder
WORKDIR /app

# KORREKTUR: Kopiere NUR den Store, nicht node_modules
COPY --from=deps /pnpm-store /pnpm-store

# Den pnpm-Store für diesen Stage konfigurieren
RUN pnpm config set store-dir /pnpm-store

# Den gesamten Rest des Monorepos kopieren
# WICHTIG: Stelle sicher, dass du eine .dockerignore-Datei hast,
# die deine lokalen node_modules ignoriert!
COPY . .

# KORREKTUR: Führe pnpm install ERST JETZT aus.
# Es wird den /pnpm-store verwenden (sehr schnell) und
# die node_modules-Symlinks korrekt für das gesamte Repo erstellen.
RUN pnpm install --frozen-lockfile

# Build-time envs setzen
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
ENV UMAMI_API_HOST="https://umami.qrcodly.de"


# Baue *nur* das 'frontend' Workspace.
# Dies funktioniert jetzt, da /app/node_modules/.bin/next existiert.
RUN pnpm --filter frontend build

# ---------- runtime image: Next.js Standalone Output verwenden ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs
  
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "./apps/frontend/server.js"]