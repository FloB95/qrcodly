# @shared/schemas

Shared package containing Zod validation schemas, DTOs, and utilities used by both the frontend and backend applications.

## What's Inside

- **Zod schemas** — validation schemas for all API request and response types
- **DTOs** — TypeScript types derived from Zod schemas for type-safe API contracts
- **Utilities** — shared helpers, QR code defaults, and content formatters (vCard, iCal)

## Usage

Import from the package alias:

```typescript
import { CreateQrCodeDto, QrCodeTypeEnum } from '@shared/schemas';
```

## Building

```bash
# From the monorepo root
pnpm run build:shared-package

# Or from this directory
pnpm run build
```

The package compiles TypeScript to `dist/` and is referenced by other apps via the workspace protocol.
