# QRcodly Load Tests (k6)

## Setup

```bash
# Install k6
brew install k6

# Configure environment
cp .env.example .env
# → Fill in CLERK_SECRET_KEY, HTACCESS_USER/PASS
```

## Quick Start

```bash
# Smoke test (5 VUs, 30s)
./run.sh

# Medium load (250 VUs)
./run.sh medium

# Heavy load (1000 VUs)
./run.sh heavy

# Spike test (sudden surge to 1000)
./run.sh spike

# Save results as JSON
SAVE_RESULTS=1 ./run.sh heavy
```

The `run.sh` script automatically reads `.env`, generates Clerk tokens, and starts k6.

Test data (QR codes + short URLs) is **created automatically** in the `setup()` phase and cleaned up in `teardown()`. No manual short code entry needed.

## .env Configuration

| Variable           | Description                                                             |
| ------------------ | ----------------------------------------------------------------------- |
| `CLERK_SECRET_KEY` | Clerk secret key (staging) — for token generation                       |
| `BASE_URL`         | Backend API URL (default: `https://stage-api.qrcodly.de/api/v1`)        |
| `FRONTEND_URL`     | Frontend URL for scan simulation (default: `https://stage.qrcodly.de`)  |
| `HTACCESS_USER`    | HTAccess username (if staging frontend is protected)                    |
| `HTACCESS_PASS`    | HTAccess password                                                       |
| `TEST_USER_IDS`    | Comma-separated Clerk user IDs                                          |
| `SHORT_CODES`      | Additional short codes for scanning (optional, auto-created by default) |
| `PROFILE`          | Default load profile                                                    |
| `MODE`             | `full` (CRUD + scans) or `scan-only`                                    |

## Modes

### Full Mode (default)

Requires: `CLERK_SECRET_KEY`

Simulates complete user flows:

- 25% QR code CRUD (create, edit, delete)
- 10% QR code read (dashboard browsing)
- 10% Short URL CRUD
- 5% Template CRUD
- 5% Tag CRUD
- 35% Scans (diverse browsers/devices)
- 10% Burst scans (viral QR code simulation)

### Scan-Only Mode

Requires: `SHORT_CODES` in `.env` (or auto-created with `CLERK_SECRET_KEY`)

100% scan traffic with realistic user agents:

- 70% Mobile (iPhone, Android, Samsung, Huawei)
- 30% Desktop (Chrome, Firefox, Safari, Edge)
- 16 languages (de, en, fr, es, it, nl, pl, ru, ...)
- Various referrers (Google, social media, direct)
- Randomized IPs

```bash
MODE=scan-only ./run.sh heavy
```

## Profiles

| Profile  | Max VUs | Duration | Purpose               |
| -------- | ------- | -------- | --------------------- |
| `smoke`  | 5       | 30s      | Verify endpoints work |
| `light`  | 50      | 3 min    | Normal traffic        |
| `medium` | 250     | 5 min    | Peak hours            |
| `heavy`  | 1000    | 9 min    | Stress test           |
| `spike`  | 1000    | 3.5 min  | Sudden traffic surge  |

## Automatic Test Data

The `setup()` function runs once before all VUs and:

1. Creates 5 dynamic QR codes (with short URLs for scanning)
2. Creates 5 standalone short URLs
3. Passes all short codes to VUs for scan simulation

The `teardown()` function cleans up all created test data after the run.

## Token Refresh

Clerk JWTs expire after ~60 seconds. The system refreshes tokens automatically:

- Each VU monitors token expiry
- 10 seconds before expiry, a new token is fetched via Clerk REST API
- Requires `CLERK_SECRET_KEY` to be passed through to k6

## Interpreting Results

Key metrics in k6 output:

| Metric                         | Good            | Concerning          |
| ------------------------------ | --------------- | ------------------- |
| `http_req_duration (p95)`      | < 2s            | > 5s                |
| `http_req_failed`              | < 5%            | > 10%               |
| `http_reqs`                    | high throughput | dropping under load |
| `http_req_duration{type:scan}` | < 1.5s          | > 3s                |

## File Structure

```
├── .env                   # Secrets & config (gitignored)
├── .env.example           # Template
├── run.sh                 # One-click runner
├── generate-tokens.mjs    # Clerk token generation (Node.js)
├── main.js                # k6 entry point (setup/teardown/default)
├── config.js              # Profiles & thresholds
├── auth.js                # Token management & auto-refresh
├── helpers.js             # HTTP helpers
├── data/
│   ├── payloads.js        # Test data generators
│   └── user-agents.js     # Browser/device simulation
├── scenarios/
│   ├── qr-codes.js        # QR code CRUD + read
│   ├── short-urls.js      # Short URL CRUD
│   ├── templates-tags.js  # Templates + tags CRUD
│   └── scan-traffic.js    # Scan & burst simulation
└── results/               # Output (gitignored)
```
