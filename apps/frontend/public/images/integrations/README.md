# Integration Logos

Each file here maps to an integration catalog entry via
`LOGO_FILE_BY_ID` in
`apps/frontend/src/components/dashboard/integrations/IntegrationLogo.tsx`.

Keep the filename stable — if you replace a logo with a different
file extension (e.g. upgrade a PNG to SVG), update the mapping in
`IntegrationLogo.tsx` accordingly.

## Sources

Logos were obtained from the official brand resources pages of each
provider and are used to identify third-party integrations (nominative
use). Follow each provider's brand guidelines when updating.

| File                   | Source                                                     |
| ---------------------- | ---------------------------------------------------------- |
| `google-analytics.svg` | official GA brand mark, simplified inline SVG kept in repo |
| `matomo.svg`           | https://matomo.org/media-resources/                        |
| `chrome.png`           | https://www.google.com/chrome/brand-guidelines/            |
| `chatgpt.webp`         | https://openai.com/brand/                                  |

## Adding a new integration

1. Download the logo from the vendor's official brand kit.
2. Drop it into this folder (any of `.svg`, `.png`, `.webp`, `.jpg`).
3. Add a `<id>: '<filename>'` entry to `LOGO_FILE_BY_ID`.
