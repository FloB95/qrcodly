# 1. Hosted pages are their own entity, addressed by a short URL

Date: 2026-11-07
Status: accepted

## Context

Hosted pages (PDF today; audio, business cards and product pages later) started as content of a
QR code: the page lived in `qr_code.content` and its files belonged to the QR code. That ties a
page to a QR code for good: no page with just a short link, no page that outlives its code, and
every page type becomes another QR content type in every client. Nothing had shipped, so changing
it cost code only.

## Decision

- A hosted page is a row in `hosted_page`. Its address is the short URL pointing at it
  (`short_url.hosted_page_id`, unique, no `ON DELETE`). A page link has no destination and is never
  handed out as a reserved code; reserved codes are taken with a guarded update.
- A QR code of a page type stores only `{ type }`; the QR code repository loads the page in on every
  read and strips it on every write, so the QR API keeps its shape and the page exists once.
- Direct-open ("open the PDF directly") is a setting of the page, not a link to a bare file: the
  toggle stays lossless and files have one delivery path.
- Uploads live in the generic `stored_file` table with a polymorphic owner (`owner_type`,
  `owner_id`); QR code and template logos can move in later. Released files keep their owner and
  are purged after `HOSTED_FILE_RETENTION_DAYS` (at most 30 per user).
- Deleting a QR code deletes its page for now (soft delete; page and files purged after the
  retention period). The model already allows keeping the page.
- Files are served under the page address (`/u/<code>/file/<documentId>`) by the frontend; the
  backend file route answers only the frontend (internal key) and only for the page's own host.
  Responses are `private, no-cache` with an ETag, so a swap, block or plan end applies at once.
- Hosted pages are reachable through the API but left out of the public API docs
  (`undocumentedSchemas`, hidden routes).
- Limits: landing pages (codes whose scan shows a page) and files in total. More files later via a
  Stripe add-on like custom domains: effective limit = plan + add-on, resolved in
  `HostedPageEntitlementService.getLimits`.

## Consequences

- New page types add a registry entry and a QR content type for the generator, no table change.
- A "Pages" dashboard tab and pages without QR codes are UI work on top of this model.
- Several links or QR codes per page would mean dropping the unique constraint and aggregating
  analytics; not planned.
- Deleting files 90 days after the Pro features end needs a tombstone on `stored_file` (purge dates
  are for released files only) and an owner download while pages are offline.
