# QRcodly InDesign Plugin

Adobe InDesign UXP panel for browsing, creating, and placing QRcodly QR codes directly into layouts.

## Requirements

- InDesign 18+ (CC 2023)
- [Adobe UXP Developer Tool](https://developer.adobe.com/photoshop/uxp/2022/guides/devtool/)
- A QRcodly Pro account with an API key (create at `qrcodly.de → Settings → API Keys`)

## Development

```bash
pnpm install
pnpm --filter @integrations/indesign dev   # webpack --watch
```

Then in Adobe UXP Developer Tool:

1. _Add Plugin_ → select `apps/integrations/indesign/manifest.json`
2. Click _Load_
3. Open InDesign → Window → Extensions → QRcodly panel appears

## Build for distribution

```bash
pnpm --filter @integrations/indesign build
```

The bundled `dist/` + `manifest.json` + `index.html` can be packaged as a `.ccx` via the UXP Developer Tool and submitted to Adobe Exchange.

## Project layout

```
src/
├── index.tsx            Panel entry
├── App.tsx              Screen router
├── screens/
│   ├── SettingsScreen   API-key input
│   ├── ListScreen       QR list + tag filter + insert
│   └── CreateScreen     Template-based create + insert
└── lib/
    ├── api-client.ts    Fetch wrapper hitting api.qrcodly.de with Bearer key
    ├── qr-renderer.ts   qr-code-styling → SVG string
    ├── uxp.ts           secureStorage + temp file helpers
    └── indesign.ts      DOM API: place SVG on active document
```

## Known limitations (MVP)

- Only URL and Text content types are supported in the Create flow. Full set (WiFi, vCard, Email, Location, Event, EPC) to follow.
- QR preview in the list is a placeholder; rendering happens at insert time.
- UXP-specific testing (`require('indesign')`, `require('uxp')`) requires a real InDesign host — the plugin falls back to `localStorage` when loaded in a plain browser for development.
- Minimum fields in the Create flow; no advanced config editing (tweak the template on qrcodly.de instead).
