# QRcodly Backend

Fastify REST API powering the QRcodly platform. Uses tsyringe for dependency injection, Drizzle ORM for database access, and Zod for request validation.

## Architecture

```
src/
├── core/                  # Framework and infrastructure
│   ├── config/            # Environment variables and constants
│   ├── db/                # Database connection, schema, migrations
│   ├── cache/             # Redis caching layer
│   ├── storage/           # S3/MinIO file uploads
│   ├── mailer/            # Nodemailer with Handlebars templates
│   ├── error/             # Custom error classes
│   ├── event/             # Event system for async operations
│   ├── rate-limit/        # Rate limiting configuration
│   ├── policies/          # Authorization policies
│   ├── http/              # Base controller, middleware
│   ├── domain/            # Base repository, entities
│   └── server.ts          # Fastify server setup
├── modules/               # Feature modules
│   ├── qr-code/           # QR code generation and management
│   ├── url-shortener/     # URL shortening and analytics tracking
│   ├── config-template/   # User-defined QR code templates
│   ├── billing/           # Stripe billing and subscriptions
│   ├── custom-domain/     # Custom domain management (Cloudflare)
│   └── tag/               # QR code tagging
└── libs/                  # Third-party library wrappers
```

## Module Convention

Each feature module follows a consistent structure:

```
modules/<feature>/
├── http/
│   ├── controller/        # Route handlers
│   └── middleware/         # Module-specific middleware
├── domain/                # Entities, repository interfaces
├── service/               # Business logic services
├── useCase/               # Use case implementations
│   └── __tests__/         # Unit tests
├── config/                # Module-specific configuration
├── error/                 # Module-specific error classes
├── event/                 # Module-specific events
├── permissions/           # Permission definitions
└── policies/              # Authorization policies
```

## Key Patterns

- **Dependency Injection** — tsyringe container manages all service and repository instances
- **Ownership Guards** — `AbstractController` provides `ensureOwnership()` for resource access control
- **Unit of Work** — database transactions via the Unit of Work pattern for multi-step operations
- **Strategy Pattern** — content update strategies for different QR code types (URL, vCard, Wi-Fi, etc.)

## Database

Uses Drizzle ORM with MySQL. Migrations run automatically on dev server start.

```bash
pnpm run db:migrate              # Apply pending migrations
pnpm run db:generate-migration   # Generate migration from schema changes
pnpm run studio                  # Open Drizzle Studio (database GUI)
```

## Environment Setup

Copy the example environment file and fill in the required values:

```bash
cp .env.example .env
```

## Scripts

| Script                           | Description                              |
| -------------------------------- | ---------------------------------------- |
| `pnpm run dev`                   | Start dev server (runs migrations first) |
| `pnpm run build`                 | Build for production                     |
| `pnpm run start`                 | Start production server                  |
| `pnpm run test`                  | Run all tests (sequential, 30s timeout)  |
| `pnpm run test:coverage`         | Run tests with coverage report           |
| `pnpm run lint`                  | Run ESLint                               |
| `pnpm run typecheck`             | Run TypeScript type checking             |
| `pnpm run db:migrate`            | Apply database migrations                |
| `pnpm run db:generate-migration` | Generate migration from schema changes   |
| `pnpm run studio`                | Open Drizzle Studio                      |
