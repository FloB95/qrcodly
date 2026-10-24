# QRcodly Browser Extension

Vite-based browser extension for generating QR codes from any web page. Built with React, Tailwind CSS, and the same QR code styling library used in the main app.

## Scripts

| Script             | Description                                              |
| ------------------ | -------------------------------------------------------- |
| `pnpm run dev`     | Build into `dist/` in watch mode against the local stack |
| `pnpm run build`   | Build the extension for production                       |
| `pnpm run test`    | Run the Vitest suite                                     |
| `pnpm run preview` | Preview the built extension (port 5174)                  |

Load `dist/` as an unpacked extension (`chrome://extensions` → Developer mode → Load unpacked).

## Environment

`dev` reads `.env.development` (local backend, Clerk development instance), `build` reads `.env.production`. The build fails if `VITE_CLERK_PUBLISHABLE_KEY` or `VITE_CLERK_SYNC_HOST` is missing.

## Authentication

The popup has no sign-in form of its own. It reuses the web app session through Clerk's [Sync Host](https://clerk.com/docs/guides/sessions/sync-host): sign in on qrcodly.de (or `localhost:3000` in dev), then reopen the popup.

- `VITE_CLERK_SYNC_HOST` must be the Clerk Frontend API domain in production (`https://clerk.qrcodly.de`) and `http://localhost` in development.
- The extension origin (`chrome-extension://<id>`) has to be listed in the Clerk instance's `allowed_origins`.
