# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QRcodly is a full-stack QR code generator and management platform. It's a pnpm monorepo with Turbo for task orchestration.

## Monorepo Structure

```
apps/
├── backend/     # Fastify REST API (Node.js)
├── frontend/    # Next.js web application
└── browser-extension/  # Vite-based browser extension

packages/
├── shared/      # @shared/schemas - DTOs, Zod schemas, utilities shared between frontend/backend
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
pnpm run build           # Build all apps via Turbo
pnpm run build:shared-package  # Build shared package only
pnpm run backend:build   # Build backend (builds shared first)
pnpm run frontend:build  # Build frontend (builds shared first)
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

**Tech Stack**: Fastify, Drizzle ORM (MySQL), Redis, Clerk auth, S3/MinIO storage, Pino logging

**Structure**:

- `src/core/` - Framework and infrastructure
  - `config/` - Environment variables and constants
  - `db/` - Database connection, schema, migrations
  - `cache/` - Redis caching layer
  - `storage/` - S3/MinIO file uploads
  - `mailer/` - Nodemailer with Handlebars templates (`templates/`)
  - `error/` - Custom error classes
  - `event/` - Event system for async operations
  - `rate-limit/` - Rate limiting configuration
  - `policies/` - Authorization policies
  - `server.ts` - Fastify server setup
- `src/modules/` - Feature modules (each has http/, service/, and often `__tests__/`)
  - `qr-code/` - QR code generation and management (supports URL, vCard, WiFi, Email, Event, Location, Text types)
  - `custom-domain/` - Custom domain management with Cloudflare integration
  - `url-shortener/` - URL shortening and analytics tracking
  - `config-template/` - User-defined QR code templates
  - `subscription/` - Billing and subscription management

**Dependency Injection**: Uses `tsyringe` for DI container

### Frontend (`apps/frontend`)

**Tech Stack**: Next.js (App Router), React, Tailwind CSS, shadcn/ui, Zustand, TanStack Query, Clerk, next-intl (i18n)

**Structure**:

- `src/app/[locale]/` - Locale-prefixed routes (i18n)
- `src/components/` - React components
  - `ui/` - shadcn/ui primitives
  - `dashboard/` - Dashboard feature sections
  - `qr-generator/` - QR code creation UI
- `src/store/` - Zustand state management
- `src/dictionaries/` - Translation files (en, de, es, fr, it, nl, pl, ru)
- `src/lib/api/` - API client utilities

### Shared Package (`packages/shared`)

Published as `@shared/schemas`. Contains:

- Zod validation schemas
- DTOs for API request/response types
- Shared utilities and QR code defaults

Import via: `import { ... } from '@shared/schemas'`

## Local Development Environment

Docker Compose provides:

- MySQL (port 3306) - credentials: root/root, database: qrcodly
- Redis (port 6379)
- MinIO S3 mock (ports 9000 API, 9001 console) - credentials: minio/testtest
- phpMyAdmin (port 8081)
- Umami analytics (port 3001)

## Testing Patterns

Backend tests use Jest with:

- Global setup/teardown for test database isolation
- `--runInBand` for sequential execution
- 30 second timeout per test
- Tests located in `__tests__/` directories within modules

## Key Conventions

- **Database naming**: snake_case for tables and columns
- **TypeScript**: Strict mode, path aliases (`@/*` for local, `@shared/schemas/*` for shared)
- **Formatting**: Prettier with tabs, semicolons, 100 char width
- **Git hooks**: lefthook runs Prettier on pre-commit
