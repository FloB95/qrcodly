# QRcodly Custom Domain Worker

Cloudflare Worker for handling custom domain routing in QRcodly.

## Overview

This worker intercepts requests to custom domains (e.g., `links.customer.com`) and:

1. Validates the domain against the QRcodly backend API
2. If valid and the path is `/u/{code}` (short URL), redirects to `www.qrcodly.de/u/{code}`
3. If valid and any other path, redirects to `www.qrcodly.de`
4. If invalid, returns a 404 error

## Prerequisites

- Node.js 18+
- Cloudflare account with Workers enabled
- Wrangler CLI installed (`npm install -g wrangler`)
- Authenticated with Cloudflare (`wrangler login`)

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Set the backend API URL secret:

   ```bash
   wrangler secret put BACKEND_API_URL
   # Enter: https://api.qrcodly.de (or your backend URL)
   ```

3. For production:
   ```bash
   wrangler secret put BACKEND_API_URL --env production
   ```

## Development

Run the worker locally:

```bash
pnpm run dev
```

This starts a local development server. You can test by sending requests with different `Host` headers.

## Deployment

Deploy to Cloudflare:

```bash
# Development/staging
pnpm run deploy

# Production
wrangler deploy --env production
```

## Configuration

### Environment Variables

| Variable         | Description                                    | Example                  |
| ---------------- | ---------------------------------------------- | ------------------------ |
| `BACKEND_API_URL`| QRcodly backend API URL (secret)               | `https://api.qrcodly.de` |
| `TARGET_DOMAIN`  | Main domain to redirect to                     | `www.qrcodly.de`         |

### Routes

Configure the worker to handle requests on your CNAME target domain (e.g., `tenant.qrcodly.de`).

In Cloudflare Dashboard:
1. Go to Workers & Pages
2. Select this worker
3. Go to Triggers > Routes
4. Add route: `tenant.qrcodly.de/*`

Or via wrangler.toml:
```toml
routes = [
  { pattern = "tenant.qrcodly.de/*", zone_name = "qrcodly.de" }
]
```

## How It Works

1. User sets up custom domain in QRcodly (e.g., `links.example.com`)
2. User adds CNAME record: `links.example.com` → `tenant.qrcodly.de`
3. Cloudflare SSL for SaaS provisions SSL certificate
4. Request flow:
   - User visits `https://links.example.com/u/abc123`
   - Request arrives at this worker (via CNAME)
   - Worker calls backend: `GET /api/v1/custom-domain/resolve?domain=links.example.com`
   - If domain is valid (registered, enabled, SSL active):
     - 301 redirect to `https://www.qrcodly.de/u/abc123`
   - If invalid: 404 error

## Caching

Domain validation results are cached in memory for 1 minute to reduce API calls.
Each worker isolate maintains its own cache.

## Monitoring

View real-time logs:

```bash
pnpm run tail
```
