# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

This is a two-part project: a **Vite/React frontend** (`app/`) and a **Python data pipeline** (`scripts/`) that produces the static JSON the frontend consumes. The repo root also holds raw source data (`TX_A.CSV`, `TX_B.CSV` from CDC USALEEP) that the pipeline reads.

The frontend is deployed as a **fully static** site to GitHub Pages — there is no backend, no database, no API. All data is precomputed by the Python scripts into JSON files in `app/public/data/`.

## Common commands

All frontend commands run from `app/`:

```bash
cd app
npm install              # first-time / after dependency changes
npm run dev              # dev server at http://localhost:5173/APH-LE-Calc/
npm run build            # tsc -b && vite build → app/dist
npm run lint             # eslint
npm run preview          # serve the production build locally
```

There is no test suite. CI runs `npm ci --legacy-peer-deps` then `npm run build` (see `.github/workflows/deploy.yml`); use `--legacy-peer-deps` locally too if a fresh install fails on peer-dep conflicts (recharts/react 19).

Data pipeline (run from repo root, regenerates files in `app/public/data/`):

```bash
python scripts/export_frontend_json.py     # zcta_health_data.json + county_summary.json
python scripts/prepare_geojson.py          # zcta_boundaries.geojson
```

The export script reads `TX_A.CSV`/`TX_B.CSV` locally and fetches HUD crosswalk + Census ACS + CDC PLACES over HTTP. Set `CENSUS_API_KEY` in the env if rate-limited.

## Architecture

### Data flow

1. Python pipeline aggregates **tract-level** USALEEP life expectancy to **ZCTA** using HUD USPS crosswalk population weights, joins ACS poverty/uninsured + PLACES diabetes/hypertension/obesity, and writes three static files into `app/public/data/`.
2. On app load, `App.tsx` calls `loadAllData()` (`src/lib/dataLoader.ts`), which fetches all three JSON/GeoJSON files in parallel and module-caches them.
3. Loaded data is stored in `HealthDataContext` (defined in `src/hooks/useHealthData.ts`) and consumed by every mode via `useHealthData()`. Components should not re-fetch — always go through the context.

### Routing & modes

`HashRouter` (so the GitHub Pages base path `/APH-LE-Calc/` works without server config). `AppShell` renders three top-level routes corresponding to the product's three modes:

- `/` → `NeighborhoodMode` — single-ZIP lookup with gauge charts
- `/explore` → `ExploreMode` (lazy) — Leaflet choropleth
- `/compare` → `CompareMode` (lazy) — multi-ZIP radar / bars / table

`AppShell` also drives the **kiosk idle showcase**: after `IDLE_TIMEOUT_MS` (60s) of inactivity, `IdleShowcase` overlays the app. This is a real product feature for conference booths, not a debug toggle — keep `useIdleTimer` wired in.

### Key invariants

- `BASE_URL` is `/APH-LE-Calc/` (set in `vite.config.ts`). Any new data fetch must go through `import.meta.env.BASE_URL`, not a hardcoded `/`.
- `HashRouter` is required by Pages deployment — do not switch to `BrowserRouter` without changing the deploy strategy.
- `TRAVIS_COUNTY_ZCTAS` in `src/lib/constants.ts` is the canonical list of 63 ZCTAs. The pipeline and frontend both filter to this set; if you add/remove ZCTAs, update both sides.
- Indicator metadata (`IndicatorKey`, `INDICATOR_LABELS`, `INDICATOR_UNITS`, `INDICATOR_HIGHER_IS_BETTER`) lives in `src/types/health.ts`. Adding a new indicator requires updating the Python export, the `ZctaHealthData` / `CountySummary` types, and these three lookup maps.
- Brand colors live in `APH_COLORS` (`src/lib/constants.ts`) — the Austin Public Health palette. Use these (or the Tailwind `aph-*` utilities derived from them) instead of arbitrary hex values; the brand guidelines PDF at the repo root is authoritative.

### Styling

Tailwind CSS 4 via `@tailwindcss/vite` (no `tailwind.config.js` — config is inline in CSS). Geist font + Material Symbols icons are loaded globally.

## Things to know

- The repo root holds large data files (`TX_A.CSV`, `TX_B.CSV`, `*.XLSX`, brand-guidelines PDF). Excel duplicates and PDFs are gitignored; the CSVs are committed because the pipeline needs them.
- `.claude/context-layer/` is gitignored — that's the local memory layer, not project state.
