# Custom domain worker

The Cloudflare Worker that answers every request on a customer's custom domain
(`links.customer.com/u/abc12`). Customer domains are Cloudflare for SaaS custom hostnames that
point at `customers.qrcodly.de`; they never reach the frontend directly.

## What it does

1. Asks the backend whether the host is a verified custom domain
   (`GET /custom-domain/resolve?domain=<host>`). The answer is kept in the edge cache: five minutes
   for a verified host, one minute for an unknown one.
2. Unknown host: `404`. Backend not reachable: `503`.
3. On `/u/<text>`: if the text may be an alias, asks the backend for its short code
   (`GET /short-url/resolve-alias?domain=<host>&alias=<text>`) and puts the short code into the
   path. Hit or miss, the answer is kept for one minute.
4. `302` to the brand domain with the path and query. The frontend resolves the short URL there
   and counts the scan.

The original host is not passed on, so everything behind the worker only ever sees the brand domain
and short codes.

## When an alias is looked up

- A text that cannot be a short code (`summer-party`) is always looked up, so a new alias works at
  once.
- A text that looks like a short code (five letters or digits) is only looked up when the host
  answer says the domain has aliases. Scans of short codes on every other domain cost no extra
  request. "No aliases" is only trusted for a minute and then asked again, so the first alias of a
  domain works within a minute whatever it looks like.
- No alias, or the lookup fails: the request goes on unchanged. A printed short code keeps working
  while the backend struggles, and an unknown alias gets the not found page of the brand domain.
- A changed or removed alias can keep resolving for up to a minute.

## Configuration

| Variable            | Default                         | Purpose                             |
| ------------------- | ------------------------------- | ----------------------------------- |
| `BACKEND_API_URL`   | `https://api.qrcodly.de/api/v1` | Base URL of the backend API         |
| `REDIRECT_BASE_URL` | `https://www.qrcodly.de`        | Origin the request is redirected to |

## Tests

No dependencies, Node's own test runner:

```bash
node --test "apps/custom-domain-worker/**/*.test.mjs"
```

## Deployment

Still by hand: the content of `src/index.mjs` is pasted into the Worker in the Cloudflare
dashboard. This folder is the source of truth for the code; a Wrangler configuration and a deploy
job are not set up yet.
