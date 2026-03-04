# QRcodly Frontend

Next.js web application using the App Router with full internationalization support (8 locales). Built with Tailwind CSS, shadcn/ui components, Zustand for state management, and TanStack Query for data fetching.

## Directory Structure

```
src/
├── app/[locale]/          # Locale-prefixed routes (i18n)
│   ├── (auth)/            # Authentication pages
│   ├── (marketing)/       # Landing and marketing pages
│   ├── dashboard/         # Authenticated dashboard
│   └── docs/              # Documentation pages (Fumadocs)
├── components/
│   ├── ui/                # shadcn/ui primitives
│   ├── dashboard/         # Dashboard feature components
│   └── qr-generator/      # QR code creation and editing UI
├── store/                 # Zustand state management
├── hooks/                 # Custom React hooks
├── lib/
│   └── api/               # API client utilities
├── dictionaries/          # Translation files (en, de, es, fr, it, nl, pl, ru)
├── i18n/                  # next-intl configuration and routing
└── middlewares/            # Next.js middleware (analytics, redirects)
```

## Key Patterns

- **Internationalization** — next-intl with 8 locales, locale-prefixed routes (`/en/...`, `/de/...`)
- **State Management** — Zustand stores for QR code configuration and UI state
- **Data Fetching** — TanStack Query for server state, API client wrappers in `lib/api/`
- **UI Components** — shadcn/ui primitives in `components/ui/`, composed into feature components
- **Authentication** — Clerk for sign-in/sign-up with protected dashboard routes

## Environment Setup

Copy the example environment file and fill in the required values:

```bash
cp .env.example .env
```

## Scripts

| Script              | Description                     |
| ------------------- | ------------------------------- |
| `pnpm run dev`      | Start dev server with Turbopack |
| `pnpm run build`    | Build for production            |
| `pnpm run start`    | Start production server         |
| `pnpm run check`    | Run lint + typecheck            |
| `pnpm run lint`     | Run Next.js ESLint              |
| `pnpm run lint:fix` | Run ESLint with auto-fix        |
