# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QRcodly is a full-stack QR code generator and management platform. It's a pnpm monorepo with Turbo for task orchestration.

## Monorepo Structure

```
apps/
├── backend/           # Fastify REST API (Node.js)
├── frontend/          # Next.js 16 web application (React 19)
└── browser-extension/ # Vite-based browser extension

packages/
├── shared/            # @shared/schemas - DTOs, Zod v4 schemas, utilities
├── eslint-config/
└── typescript-config/
```

## Commands

### Development

```bash
# Start local services (MySQL, Redis, MinIO, etc.)
cd apps/backend && pnpm run dev-server   # or: docker-compose up -d

# Run both apps
pnpm run start:dev

# Run individually
pnpm run backend:dev     # Fastify API at :5001 (runs migrations first)
pnpm run frontend:dev    # Next.js at :3000 (uses turbo)
```

### Building

```bash
pnpm run build                 # Build all apps via Turbo
pnpm run build:shared-package  # Build shared package only (must run before app builds)
pnpm run backend:build         # Build backend (builds shared first)
pnpm run frontend:build        # Build frontend (builds shared first)
```

### Testing

```bash
# Backend tests (Jest)
cd apps/backend
pnpm run test                    # Run all tests (runs migrations first, uses --runInBand)
pnpm run test -- path/to/test    # Run specific test file
pnpm run test:coverage           # Run with coverage

# Pre-PR validation
pnpm run pr:precheck             # lint + typecheck + test + build
```

### Linting & Type Checking

```bash
pnpm run lint            # Lint all workspaces via Turbo
pnpm run format          # Prettier format entire repo

# Per-app
cd apps/backend && pnpm run lint && pnpm run typecheck
cd apps/frontend && pnpm run check  # runs lint + typecheck
```

### Database

```bash
cd apps/backend
pnpm run db:migrate              # Apply migrations (runs automatically with dev/test)
pnpm run db:generate-migration   # Generate new migration from schema changes
pnpm run studio                  # Open Drizzle Studio
```

## Architecture

### Backend (`apps/backend`)

**Tech Stack**: Fastify, Drizzle ORM (MySQL), Redis, Clerk auth, S3/MinIO, Pino logging, tsyringe DI

**Module Structure** (`src/modules/`): 7 modules — `qr-code`, `url-shortener`, `billing`, `custom-domain`, `config-template`, `tag`, `analytics-integration`

Each module follows this layout:

- `domain/entities/` — Drizzle table definitions + TypeScript types
- `domain/repository/` — Data access extending `AbstractRepository`
- `useCase/` — Business logic classes (`*.use-case.ts`)
- `http/controller/` — Decorator-based route handlers
- `http/__tests__/` — Integration tests
- `service/` — Stateless services (optional)
- `event/handler/` — Event handlers (optional)
- `setup.ts` — Module registration via `registerRoutes()`

**DI Conventions (tsyringe)**:

- Controllers and UseCases: `@injectable()` (transient, new instance per resolution)
- Repositories and Services: `@singleton()` (single shared instance)
- All deps injected via `@inject(ClassName)` constructor params

**Route Registration**: Decorator-based (`@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`) with Zod schema validation for body/query/response. Routes are registered in each module's `setup.ts` via `registerRoutes(fastify, ControllerClass, prefix)`.

**API prefix**: `/api/v1` (e.g., `/api/v1/qr-code`, `/api/v1/short-url`, `/api/v1/billing`)

**Core infrastructure** (`src/core/`):

- `db/` — Connection, schema re-exports, migrations. All entity schemas centrally re-exported from `db/schemas/index.ts`
- `cache/` — Redis caching (`KeyCache`)
- `storage/` — S3/MinIO file uploads
- `server.ts` — Fastify server setup, plugin registration, module loading

**Database patterns**: `AbstractRepository` provides pagination, caching, soft deletes. `UnitOfWork` + `TransactionContext` for multi-operation transactions.

### Frontend (`apps/frontend`)

**Tech Stack**: Next.js 16 (App Router, Turbo dev), React 19, Tailwind CSS, shadcn/ui, Zustand, TanStack Query, Clerk, next-intl

**Routing**: `src/app/[locale]/` — locale-prefixed routes. Dashboard routes under `/dashboard/` are protected via Clerk middleware.

**Middleware**: `src/proxy.ts` chains Clerk auth + next-intl middleware. Handles `/u/[shortCode]` analytics redirects.

**API calls** (`src/lib/api/`): `apiRequest<T>()` utility with Bearer token auth from Clerk. Each API module exports TanStack Query hooks (e.g., `useListQrCodesQuery`, `useCreateQrCodeMutation`).

**State**: Zustand store (`src/store/useQrCodeStore.ts`) for QR code generator form state with localStorage persistence.

**Env validation**: `@t3-oss/env-nextjs` in `src/env.js` — type-safe server/client env vars.

**i18n**: 8 locales (en, de, es, fr, it, nl, pl, ru). Translation files in `src/dictionaries/`. Uses `localePrefix: 'as-needed'`.

### Shared Package (`packages/shared`)

Published as `@shared/schemas`. Import via: `import { ... } from '@shared/schemas'`

Uses **Zod v4** (from pnpm catalog). Contains:

- `src/schemas/` — Source-of-truth Zod schemas (e.g., `QrCode.ts` with discriminated union for 8 content types: URL, Text, WiFi, vCard, Email, Location, Event, EPC)
- `src/dtos/` — Request/response DTOs derived from schemas via `.pick()`, `.extend()`. Organized by feature domain.
- `src/utils/` — QR code content converters, default styling options, deep diff utility

**DTO naming**: `CreateXDto`, `UpdateXDto`, `XResponseDto`, `XPaginatedResponseDto`, `XListRequestDto`

Build: `tsc` → `dist/` (CommonJS). Must be built before backend/frontend (`pnpm run build:shared-package`).

## Local Development Environment

Docker Compose provides:

- MySQL (3306) — root/root, database: qrcodly
- Redis (6379)
- MinIO S3 mock (9000 API, 9001 console) — minio/testtest
- phpMyAdmin (8081)
- Umami analytics (3001)

## Testing Patterns

Backend tests use Jest with:

- Global setup/teardown for test database isolation
- `--runInBand` for sequential execution
- 30 second timeout per test
- Tests in `__tests__/` directories within module `http/` dirs

## Key Conventions

- **Database naming**: snake_case for tables and columns
- **TypeScript**: Strict mode, path aliases (`@/*` for local, `@shared/schemas` or `@shared/schemas/*` for shared)
- **Formatting**: Prettier with tabs, semicolons, 100 char width
- **Git hooks**: lefthook runs Prettier on staged files at pre-commit
- **Locale translations**: When adding/changing user-facing strings, update all 8 locale dictionaries
