# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# QRcodly - Project Context

QRcodly is a free open-source QR code generation and management platform with dynamic QR codes, URL shortening, and analytics.

## Monorepo Structure

Turborepo-based monorepo with pnpm workspaces:

- `apps/backend` - Fastify Node.js API server (TypeScript)
- `apps/frontend` - Next.js 16 React application with internationalization
- `packages/shared` - Shared TypeScript schemas and utilities (Zod-based)
- `packages/eslint-config` - Shared ESLint configuration
- `packages/typescript-config` - Shared TypeScript configuration

**Requirements:** Node.js >=22.11.0, pnpm >=9.15.9

## Development Commands

### Root Level (runs across all apps via Turborepo)

```bash
pnpm setup              # Install dependencies
pnpm build              # Build all apps
pnpm lint               # Lint all apps
pnpm format             # Format code with Prettier
pnpm clean              # Clean build artifacts
pnpm start:dev          # Run backend + frontend in parallel (dev mode)
```

### Backend (`apps/backend`)

```bash
# Development
pnpm run dev            # Development with tsx watch (auto DB migrations)
pnpm run dev-server     # Start Docker services (MySQL, Redis, Umami, MinIO)

# Testing
pnpm test               # Run all tests with Jest (--runInBand)
pnpm test <pattern>     # Run specific test file (e.g., pnpm test update-qr-code.test.ts)
pnpm test:coverage      # Run tests with coverage
pnpm test:detectOpenHandles  # Debug async operations

# Database
pnpm run db:migrate            # Run Drizzle migrations
pnpm run db:push               # Push schema changes
pnpm run db:generate-migration # Generate new migration
pnpm run studio                # Open Drizzle Studio

# Build & Quality
pnpm run build          # Compile TypeScript
pnpm run start          # Production (with DB migrations)
pnpm run lint           # ESLint
pnpm run typecheck      # TypeScript type check
pnpm run pr:precheck    # Full PR check (lint + typecheck + test + build)

# CLI
pnpm run cli:list       # List QR codes via CLI
```

### Frontend (`apps/frontend`)

```bash
# Development
pnpm run dev            # Next.js dev server with Turbo

# Build & Quality
pnpm run build          # Production build
pnpm run start          # Production server
pnpm run preview        # Build + start production locally
pnpm run check          # Lint + typecheck
pnpm run lint           # ESLint
pnpm run lint:fix       # ESLint with auto-fix
pnpm run typecheck      # TypeScript type check
pnpm run format:check   # Prettier check
pnpm run format:write   # Prettier format
```

### Shared Package (`packages/shared`)

```bash
pnpm run build          # Compile TypeScript
```

## Tech Stack

### Backend

- **Framework:** Fastify (Node.js)
- **Language:** TypeScript (ES2020, strict mode)
- **Database:** MySQL 8 with Drizzle ORM
- **Cache/Rate Limiting:** Redis (ioredis)
- **Auth:** Clerk (JWT-based)
- **Testing:** Jest v29.4.6 with ts-jest
- **QR Generation:** qr-code-styling
- **Analytics:** Umami (self-hosted)
- **DI:** tsyringe
- **Storage:** AWS S3 (MinIO for local dev)
- **Monitoring:** Axiom, Sentry
- **Email:** nodemailer with Handlebars templates
- **CLI:** commander

### Frontend

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn/ui (Radix primitives)
- **State Management:** Zustand (local) + React Query (server)
- **Forms:** React Hook Form + Zod validation
- **Auth:** Clerk
- **Analytics:** PostHog + @umami/node
- **Animation:** Framer Motion
- **i18n:** next-intl (locale-based routing)
- **Icons:** Heroicons + Lucide React
- **QR Rendering:** qr-code-styling
- **Documentation:** Fumadocs with OpenAPI
- **Utilities:** date-fns, ical-generator, vcf, Google Maps API

### Shared

- **Validation:** Zod schemas for all DTOs
- **Type Safety:** Shared TypeScript types between frontend/backend

## Backend Architecture (Clean Architecture)

### Module Structure

Each module follows: `src/modules/{module-name}/`
- `domain/` - Entities and value objects
- `useCase/` - Business logic (injectable with tsyringe)
- `http/` - Fastify routes and controllers
- `service/` - Cross-cutting services
- `policies/` - Access control and rate limiting
- `error/` - Custom error classes
- `event/` - Domain events

### Core Modules

#### 1. QR Code Module (`src/modules/qr-code/`)

**Content Types:** URL, Text, Event, WiFi, vCard, Email, Location, Phone

**Key Use Cases:**
- `CreateQrCodeUseCase` - Creates QR with optional short URL linking
- `UpdateQrCodeUseCase` - Updates QR (prevents content type changes)
- `DeleteQrCodeUseCase` - Deletes QR and associated images
- `BulkImportQrCodesUseCase` - CSV bulk import
- `GetQrCodeByIdUseCase` - Retrieve by ID
- `ListQrCodesUseCase` - Paginated listing

**Strategy Pattern (Important):**
- `ShortUrlStrategyService` - Routes to strategy based on content type
- `UrlStrategy` - Handles editable URLs (links to short URL)
- `EventUrlStrategy` - Handles event QRs (creates dynamic short URL)
- `VCardStrategy` - Handles dynamic vCards

**Policies:**
- `CreateQrCodePolicy` - Enforces plan limits (Redis-backed usage tracking)

**Plan Limits** (`src/core/config/plan.config.ts`):
```typescript
QR_CODE_PLAN_LIMITS = {
  free: { url: 10, text: 5, event: 0 },
  pro: { url: null, text: null, event: 100 }
}
```

#### 2. URL Shortener Module (`src/modules/url-shortener/`)

**Key Use Cases:**
- `CreateShortUrlUseCase` - Generates unique short codes
- `GetReservedShortCodeUseCase` - Gets/creates reserved URLs (reuses existing)
- `UpdateShortUrlUseCase` - Updates with redirect loop prevention
- `GetShortUrlByCodeUseCase` - Retrieves by code

**Critical Business Logic:**
- **Reserved URL Reuse:** Users get same reserved URL until linked to QR
- **Redirect Loop Prevention:** Prevents short URL pointing to itself
- **Dynamic QR Redirects:** `DYNAMIC_QR_BASE_URL` + qrCodeId

**Analytics Integration:**
- `UmamiAnalyticsService` - Fetches pageviews, browser/OS/device metrics

#### 3. Config Template Module (`src/modules/config-template/`)

**Purpose:** Reusable QR code styling templates

**Features:**
- User custom templates
- Predefined immutable templates

### Database Schema (Drizzle ORM)

**Key Tables:**
- `qr_codes` - Content (JSON), config (JSON), previewImage
- `short_urls` - shortCode, destinationUrl, qrCodeId (nullable), isActive
- `config_templates` - name, config (JSON), isPredefined
- `users` - Managed by Clerk

### Core Infrastructure (`src/core/`)

- `db/` - Drizzle connection, migrations, UnitOfWork pattern
- `cache/` - Redis client and utilities
- `logger/` - Pino-based logging
- `events/` - Domain event bus
- `s3/` - S3 upload/delete service
- `config/` - Plan limits, constants, environment validation

## Frontend Architecture

### State Management

**Zustand Store** (`src/store/useQrCodeStore.ts`):
- QR code generator state (config, content, bulk mode)
- localStorage persistence
- Actions: updateConfig, updateContent, updateBulkMode

**React Query** (`@tanstack/react-query`):
- Server state caching
- Mutations for API calls
- Automatic refetching

### Component Organization

```
src/components/
├── qr-generator/        # QR generation feature
│   ├── content/         # Content type sections (URL, Email, Event, etc.)
│   ├── style/           # Styling controls (colors, shapes, icons)
│   ├── templates/       # Template selection
│   └── download-buttons/ # Export formats
├── dashboard/           # QR management and analytics
│   └── qrCode/
│       ├── content-renderers/ # Display components per type
│       └── hooks/       # Dashboard logic hooks
├── plans/               # Plan selection
├── provider/            # Context providers and stores
├── docs/                # Documentation components
└── ui/                  # shadcn/ui base components
```

### API Client Layer (`src/lib/api/`)

- `qr-code.ts` - QR mutations and queries
- `url-shortener.ts` - Short URL operations
- `config-template.ts` - Template management
- `ApiError.ts` - Error handling

Pattern: React Query hooks (useQuery, useMutation) with `apiRequest()` utility

### Routing & i18n

- App Router with `[locale]/` directory
- Supported locales: en, de (next-intl)
- Server and Client components mixed

## Testing

### Test Structure

**Integration Tests** (`src/modules/*/http/__tests__/*.test.ts`):
- Use `getTestServerWithUserAuth()` - provides `accessToken` and `accessToken2`
- Database setup/teardown with `shutDownServer()`
- 30s timeout
- Run with `pnpm test <filename>`

**Unit Tests** (`src/modules/*/useCase/__tests__/*.use-case.test.ts`):
- Use `jest-mock-extended` for type-safe mocks
- Test business logic in isolation

### Test Utilities

- **Factories** (`src/tests/shared/factories/`): QR code DTOs, short URL DTOs, CSV
- **Assertions** (`src/tests/shared/assertions/`): Reusable validators
- **Mocks** (`src/tests/shared/mocks/`): Umami API responses

### ESLint Overrides for Tests

- Disables `@typescript-eslint/unbound-method` (Jest mocks)
- Allows `_` prefix for unused variables
- Disables unsafe type rules for mocks

## Local Development

### Docker Services (`docker-compose.yaml`)

```bash
pnpm run dev-server  # Starts all services
```

**Services:**
- MySQL 8 (3306) + phpMyAdmin (8081)
- Redis (6379)
- Umami Analytics (3001) + PostgreSQL
- MinIO S3 (9000/9001) - Local S3 alternative

### Environment Variables

**Backend** (`.env`):
- `DATABASE_URL` - MySQL connection
- `REDIS_URL` - Redis connection
- `CLERK_*` - Clerk API keys
- `UMAMI_*` - Analytics credentials
- `DYNAMIC_QR_BASE_URL` - Base URL for dynamic redirects
- `S3_*` - AWS S3 or MinIO credentials
- `FRONTEND_URL` - For CORS

**Frontend** (`.env.local`):
- `NEXT_PUBLIC_CLERK_*` - Public Clerk keys
- `NEXT_PUBLIC_UMAMI_*` - Public analytics keys

## Important Patterns

### Backend: Creating a QR Code

1. `CreateQrCodePolicy.checkAccess()` - Verify plan limits
2. Upload config image if provided
3. `ShortUrlStrategyService.handle()` - Link short URL if applicable (editable URL, event, dynamic vCard)
4. Save to database in UnitOfWork transaction
5. `CreateQrCodePolicy.incrementUsage()` - Update Redis usage counter
6. Emit `QrCodeCreatedEvent`

### Backend: Updating a QR Code

1. Prevent content type changes (throw BadRequestError)
2. Delete old images if config/preview changed
3. Upload new images if needed
4. Update linked short URL if URL QR is editable (via strategy)
5. Emit `QrCodeUpdatedEvent`

### Backend: Reserved Short URL Flow

1. User creates editable URL or event/vCard QR
2. `GetReservedShortCodeUseCase` checks for existing reserved URL
3. If exists and not linked → reuse it
4. If not exists → create new (destinationUrl=null, isActive=false)
5. `UpdateShortUrlUseCase` activates and links to QR

### Frontend: Form Handling with Dynamic Flags

For content types with dynamic flags (`isEditable`, `isDynamic`):
- Include flag as form field in `defaultValues`
- Use `useWatch` to track all fields including flag
- Debounced submission includes flag in payload
- Example: `VCardSection` with `isDynamic` checkbox

### Frontend: API Mutations

Pattern:
```typescript
const mutation = useCreateQrCode();
mutation.mutate(dto, {
  onSuccess: (data) => { /* ... */ },
  onError: (error) => { /* ... */ }
});
```

## Key Files & Locations

### Configuration
- `src/core/config/plan.config.ts` - Plan limits
- `src/core/config/constants.ts` - API paths, rate limits
- `.eslintrc.js` - ESLint with test overrides

### Strategies
- `src/modules/qr-code/service/short-url-strategy.service.ts` - Router
- `src/modules/qr-code/service/short-url-strategies/url.strategy.ts`
- `src/modules/qr-code/service/short-url-strategies/event.strategy.ts`
- `src/modules/qr-code/service/short-url-strategies/vcard.strategy.ts`

### Policies
- `src/modules/qr-code/policies/create-qr-code.policy.ts` - Rate limiting

### Shared Schemas
- `packages/shared/src/schemas/QrCode.ts` - All QR content type schemas
- `packages/shared/src/schemas/ShortUrl.ts` - Short URL schemas
- `packages/shared/src/utils/General.ts` - Helpers, defaults

## Notes for Future Sessions

1. Review this document first
2. Check git status and recent commits
3. Run `pnpm test` in backend to verify current state
4. Follow existing patterns:
   - Backend: Clean Architecture, strategy pattern, dependency injection
   - Frontend: Server/Client components, React Query, Zustand
5. All new features should have integration + unit tests
6. Respect plan limits and rate limiting policies
7. For dynamic content types (editable/dynamic flags), include flag as form field
