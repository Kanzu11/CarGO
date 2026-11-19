# CarGo — Fleet & Landmark Dispatch

Mobile-first ride-hailing, Bajaj and local fleet dispatch **PWA for Ethiopia**, built to be wrapped as an Android Trusted Web Activity (TWA).

- **`/`** — Rider & Driver app (landmark-first pickup, upfront locked ETB fares, live 3D trip tracking)
- **`/dispatch`** — Live geospatial fleet command center
- **`/design`** — Design system reference

**Stack:** Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS v4 · MapLibre GL · Zustand · lucide-react

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run lint` | ESLint (next/core-web-vitals + typescript) |
| `npm run test` | Vitest unit tests |

## Build status by phase

| Phase | Scope | Status |
|---|---|---|
| 1 | Foundation, design system, PWA/TWA shell | ✅ Done |
| 2 | Fleet engine, Ethiopia city data, store | ⏳ Next |
| 3 | 3D map engine | — |
| 4 | Mobile app `/` (Rider + Driver) | — |
| 5 | Ops command center `/dispatch`, polish, release | — |

## PWA & Android TWA

- Manifest at `/manifest.webmanifest` (`app/manifest.ts`): standalone, portrait, `#09090B` theme, 192/512 maskable icons rendered at build time by `app/icons/[size]/route.tsx`.
- Viewport is locked (`maximumScale: 1`, `userScalable: false`, `viewportFit: cover`), `html, body` are fixed to `100dvh` with `overscroll-behavior: none`, and safe-area insets are respected.
- Digital Asset Links template: `public/.well-known/assetlinks.json`. After `bubblewrap init --manifest https://<your-host>/manifest.webmanifest`, replace `REPLACE_WITH_BUBBLEWRAP_SHA256_FINGERPRINT` with your signing key's SHA-256 fingerprint and set `package_name` to your TWA package id.
- Network resilience: a 24px status banner appears while offline ("Reconnecting to CarGo dispatch…") without resetting any app state.
