# QRcodly Figma Plugin

Figma plugin for browsing, creating, and placing QRcodly QR codes directly on the canvas. Feature parity with the [InDesign plugin](../indesign), plus vector (SVG) placement.

## Requirements

- Figma desktop app (needed to load development plugins)
- A QRcodly Pro account with an API key (create at `qrcodly.de → Settings → API Keys`)

## Development

```bash
pnpm install
pnpm --filter @integrations/figma dev   # esbuild --watch, API → http://localhost:5001/api/v1
```

Then in the Figma desktop app:

1. _Plugins → Development → Import plugin from manifest…_ → select `apps/integrations/figma/manifest.json`
2. Run it from _Plugins → Development → QRcodly_

`dist/ui.html` also opens in a plain browser: the UI then falls back to `localStorage` instead of the plugin sandbox, which is handy for styling work.

Point a build at another API with `QRCODLY_API_URL=… pnpm --filter @integrations/figma build`. That host must also be listed in `manifest.json → networkAccess`, or Figma blocks the requests.

## Build & publish

```bash
pnpm --filter @integrations/figma build
```

Publishing needs the Figma desktop app and two-factor authentication on the publishing account:

1. Figma logo → _Plugins → Manage plugins_ → options next to QRcodly → _Publish_.
2. Fill in name, tagline, description, category (_Design tools → Import & export_), icon and thumbnail (both in `community/`), plus a support contact.
3. Keep the plugin ID in `manifest.json` (`1695759428910776258`): Figma assigned it on first publish and ships every update under it.
4. Figma reviews Community plugins before they are listed. Once approved, switch the `figma` entry in `apps/frontend/src/lib/integrations-catalog.ts` from `coming-soon` to `external-link` with the Community URL, `ctaKey: 'figma.cta'` and `requiresApiKey: true`.

Later releases: rebuild, then _Publish new version_ from the same menu.

## Project layout

```
manifest.json            Figma manifest (network access limited to api.qrcodly.de)
build.mjs                esbuild: sandbox bundle + single-file UI (JS/CSS inlined)
src/
├── shared/messages.ts   Typed RPC contract between UI and sandbox
├── plugin/code.ts       Sandbox: clientStorage, selection → placement, node creation
└── ui/
    ├── App.tsx          Screen router
    ├── screens/         Settings (API key) · List (browse + insert) · Create
    ├── components/      QrPreview, PlacementHint, Logo, Spinner
    └── lib/             api-client, bridge (RPC), insert, content-types
```

The UI iframe does all network work (listing, rendering via `POST /qr-code/render`); the sandbox only touches the document and `figma.clientStorage`, which the iframe cannot reach.

## Placement

What the plugin does with the next QR code depends on the selection, and the panel always shows it:

| Selection                                     | Result                                                   |
| --------------------------------------------- | -------------------------------------------------------- |
| A QR code inserted by this plugin             | Replaced in place (same position and size)               |
| An empty frame                                | Fills the frame, centred                                 |
| A frame or section with content               | Placed inside, centred, ~18% of its shorter side         |
| A shape (rectangle, ellipse, polygon, vector) | Fitted onto the shape as a placeholder, layered above it |
| Anything else / nothing                       | Centre of the viewport, 240 px                           |

Codes are inserted as vectors by default (`createNodeFromSvg`); _Insert as → PNG_ places a 2048 px image fill instead, which is the fallback if Figma cannot import a particular style as SVG.

Vector import was checked in Figma against the backend's own renders: every dot and corner style, linear and radial gradients, gradient backgrounds, an embedded logo (imported as an image fill) and rgba transparency all decode and match pixel for pixel, apart from anti-aliasing.

## API key handling

- Stored with `figma.clientStorage`: local to the user's machine and this plugin. It is never written into the document (inserted nodes only carry the QR code's ID as private plugin data), so sharing, duplicating, or publishing a file never exposes it.
- Only ever sent as a `Bearer` header to the API host. `networkAccess` in the manifest restricts the plugin to `api.qrcodly.de`, so the key can't be sent anywhere else, even by accident.
- Checked against the API before it is stored; _Disconnect_ deletes it. Users can revoke a key at any time on qrcodly.de.
