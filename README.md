# QRcodly

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.11-green)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9.15-orange)](https://pnpm.io/)

**QRcodly** is a free, open-source QR code generator and management platform. Create, customize, and track QR codes for URLs, contact details, Wi-Fi credentials, and more.

## Features

- **Multiple QR code types** — URL, vCard, Wi-Fi, Email, Calendar Event, Location, Plain Text
- **Full customization** — colors, sizes, backgrounds, and custom icon uploads
- **Export formats** — PNG, JPEG, SVG
- **URL shortening & analytics** — shorten links and track scans
- **Templates** — save and reuse QR code configurations
- **Custom domains** — use your own domain for short URLs (Cloudflare integration)
- **Internationalization** — 8 languages (EN, DE, ES, FR, IT, NL, PL, RU)
- **Authentication** — powered by Clerk
- **Browser extension** — generate QR codes from any page

## Monorepo Structure

```
qrcodly/
├── apps/
│   ├── backend/            # Fastify REST API
│   ├── frontend/           # Next.js web application
│   └── browser-extension/  # Vite-based browser extension
├── packages/
│   ├── shared/             # Zod schemas, DTOs, and shared utilities
│   ├── eslint-config/      # Shared ESLint configuration
│   └── typescript-config/  # Shared TypeScript configuration
├── docker-compose.yaml     # Local development services
└── turbo.json              # Turborepo pipeline configuration
```

See per-app READMEs for architecture details:
[Backend](apps/backend/README.md) ·
[Frontend](apps/frontend/README.md) ·
[Browser Extension](apps/browser-extension/README.md) ·
[Shared Package](packages/shared/README.md)

## Tech Stack

| Layer          | Technologies                                                                            |
| -------------- | --------------------------------------------------------------------------------------- |
| **Frontend**   | Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Zustand, TanStack Query, next-intl |
| **Backend**    | Fastify, TypeScript, Drizzle ORM, tsyringe (DI), Zod, Nodemailer, Handlebars            |
| **Database**   | MySQL, Redis                                                                            |
| **Storage**    | S3 / MinIO                                                                              |
| **Auth**       | Clerk                                                                                   |
| **Billing**    | Stripe                                                                                  |
| **Analytics**  | Umami, PostHog                                                                          |
| **Monitoring** | Axiom, Sentry                                                                           |

## Prerequisites

- [Node.js](https://nodejs.org/) >= 22.11
- [pnpm](https://pnpm.io/) >= 9.15
- [Docker](https://www.docker.com/) (for local development services)

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/FloB95/qrcodly.git
cd qrcodly

# 2. Install dependencies
pnpm install

# 3. Start local services (MySQL, Redis, MinIO, Umami)
docker-compose up -d

# 4. Set up environment variables
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
# Edit both .env files with your configuration (Clerk keys, etc.)

# 5. Start development servers
pnpm run start:dev
# Backend API → http://localhost:5001
# Frontend   → http://localhost:3000
```

## Available Scripts

| Script                          | Description                                    |
| ------------------------------- | ---------------------------------------------- |
| `pnpm run start:dev`            | Start backend and frontend in development mode |
| `pnpm run backend:dev`          | Start backend only (runs migrations first)     |
| `pnpm run frontend:dev`         | Start frontend only                            |
| `pnpm run build`                | Build all apps via Turborepo                   |
| `pnpm run build:shared-package` | Build the shared package only                  |
| `pnpm run lint`                 | Lint all workspaces                            |
| `pnpm run format`               | Format all files with Prettier                 |
| `pnpm run clean`                | Clean build artifacts across all apps          |

## Local Services (Docker Compose)

| Service         | Port                       | Details                                           |
| --------------- | -------------------------- | ------------------------------------------------- |
| MySQL           | 3306                       | Credentials: `root` / `root`, database: `qrcodly` |
| Redis           | 6379                       | —                                                 |
| MinIO (S3)      | 9000 (API), 9001 (Console) | Credentials: `minio` / `testtest`                 |
| phpMyAdmin      | 8081                       | —                                                 |
| Umami Analytics | 3001                       | —                                                 |

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and setup instructions.

## License

This project is licensed under the [MIT License](LICENSE).
