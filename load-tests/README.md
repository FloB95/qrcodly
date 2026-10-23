# QRcodly load test (k6)

Simulates logged-in users working in the dashboard — the Next.js pages they open (full load
first, then client-side navigations) plus every API call those screens fire: sidebar counts,
lists with per-row view counts, detail pages with analytics, creating / editing / deleting /
duplicating / sharing QR codes, short links, tags and templates, with human pauses in between.
Each virtual user is its own Clerk test account, so per-user rate limits behave as in
production. The report answers: **how many concurrent users stay within the SLOs?**

## Setup (once)

```bash
brew install k6                # plus Node.js 22+
cp .env.example .env           # fill in CLERK_SECRET_KEY + CLERK_PUBLISHABLE_KEY of the target instance
./run.sh provision 1000        # create 1000 persistent test users (production: ~40 min, resumable)
./run.sh seed                  # give each a starting account (8 QR codes, 1 link, 3 tags, 1 template)
```

Test users are **permanent** (`loadtest-0001@loadtest.qrcodly.de` …, Clerk `external_id`
`loadtest-NNNN`). Keep them between runs — no data of deleted users can dangle in the database,
and their seeded short codes are reused instead of minting new ones each time.

## Every run

```bash
./run.sh smoke                                   # 3 users, 2 min — always first
STEPS=50,200,500,1000 ./run.sh stress            # 5 min per step, 2 min ramps (~30 min)
./run.sh cleanup                                 # back to the seeded baseline
```

Other profiles: `baseline` (25 users), `load` (`USERS`, default 200, 15 min), `soak` (60 min),
`spike` (10 % → `USERS` in 30 s → back). Knobs: see `.env.example` (`THINK`, `PAGE_LOADS`, `HOLD`…).

While running: live dashboard at http://127.0.0.1:5665 — close that tab when the run ends,
k6 waits for open dashboard tabs before it writes the reports. Afterwards `results/<run>-report.txt`
(capacity table + slowest endpoints), `<run>.html` (charts) and `<run>-summary.json`.

## Safety on production

- **401 → immediate stop.** The backend blocks an IP for 7 days after 30 × 401 per hour.
  Tokens are minted to outlive the run and checked before it starts. If it ever happens:
  `DEL ip_abuse:blocked:<ip> ip_abuse:attempts:<ip>` in Redis.
- **Circuit breaker:** 10 failed (5xx/timeout) or > 20 s requests in a row stop the test.
- **Short codes are reserved forever**, even after deletion. Each user may mint at most
  `NEW_CODES_PER_USER` (default 2) per run; then it only creates static QR codes. The report
  prints how many were used. Seeding costs 2 dynamic QR codes + 1 link per user, once.
- **Cloudflare** fronts the frontend; if it challenges k6, the run stops. Allow the load
  generator's IP in Cloudflare or rerun with `PAGE_LOADS=0` (API only).
- Destination URLs come from a 25-URL pool, so Google Web Risk lookups stay cached.
- Scans (`SCAN_RATE`) are off by default: they write Umami analytics and are limited to
  200/min per IP by the backend.
- Load-test traffic is recognisable in Axiom by `qrcodly-loadtest` in the user agent.

## Side effects to expect

- Clerk: the test users count as users of the instance. During a run the backend asks Clerk
  once per active user per minute (ban check) — ~17 requests/s at 1000 users, well within
  Clerk's 1000 per 10 s. k6 itself makes no Clerk calls during a run.
- S3: every created QR code/template gets a preview image; cleanup deletes them. A code
  deleted within seconds of creation can leave its preview behind (app race).
- MySQL: deleted links stay as soft-deleted rows — that is how QRcodly keeps codes reserved.

## Test users are permanent

Provision once, reuse for every run — never delete them. Their short codes (seeded and minted
during runs) simply stay theirs. `./run.sh destroy` exists only for the case the test accounts
ever have to go; it would leave their soft-deleted links behind under user IDs that no longer
exist, so don't use it casually.

## Files

| File         | Purpose                                                          |
| ------------ | ---------------------------------------------------------------- |
| `run.sh`     | entry point for everything above                                 |
| `users.mjs`  | Clerk test users: provision, tokens, status, delete              |
| `main.js`    | k6 load test (setup preflight, users, optional scans)            |
| `seed.js`    | baseline data per test user                                      |
| `cleanup.js` | deletes run data (or everything) through the API and verifies it |
| `config.js`  | target, knobs, profiles, thresholds                              |
| `journeys/`  | what a user does: QR codes, short links, tags/templates, scans   |
| `lib/`       | HTTP client + guards, query cache, sessions, preflight, report   |
| `data/`      | payload generators (valid against the shared Zod DTOs), scan UAs |
