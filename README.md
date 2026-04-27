<h1 align="center">Austin Health Pulse</h1>

<p align="center">
  <strong>Life Expectancy & Health Indicator Explorer for Travis County</strong>
</p>

<p align="center">
  <a href="https://crypticpy.github.io/APH-LE-Calc/">
    <img src="https://img.shields.io/badge/Live_Demo-GitHub_Pages-44499C?style=for-the-badge&logo=github" alt="Live Demo" />
  </a>
</p>

<p align="center">
  An interactive public health data visualization tool that lets Austin residents and policymakers explore health outcomes across <strong>63 ZIP codes</strong> in Travis County, Texas.
</p>

---

## Built rapidly with AI assistance

This entire prototype — Python data pipeline, three interactive modes, choropleth map, comparison views, gauge charts, calculators, kiosk showcase, and deploy pipeline — was built by **Austin Public Health IT staff in approximately 12 hours of internal development time** (three four-hour sessions) using Claude as an AI pair programmer.

|                      | APH IT (this build) | Typical agency engagement        |
| -------------------- | ------------------- | -------------------------------- |
| **Time**             | ~12 hours           | 6-8 weeks                        |
| **Hours**            | 3 × 4-hr sessions   | 250-400 hours                    |
| **Approximate cost** | ~$1.5K loaded staff | $50K-$100K (blended $175-250/hr) |

This project demonstrates how AI-assisted development can compress data-product timelines from months to days, enabling public-sector teams to prototype quickly, validate ideas with the community, and inform decisions about full production builds. See the in-app **About → How This Was Built** panel for the per-session breakdown.

---

## Features

### Check Your Neighborhood

Enter a ZIP code (or use geolocation) to instantly see your neighborhood's **life expectancy at birth** alongside five key health indicators — poverty rate, uninsured rate, diabetes, hypertension, and obesity prevalence — displayed as animated gauge charts compared to county averages. Optionally enter your age for **age-specific remaining life expectancy** estimates.

### Disparity views

A **disparity hero card** surfaces the gap between Travis County's longest- and shortest-living ZIP codes, with the user's ZIP positioned in context. A **sorted bar strip** ranks all 60+ Travis County ZCTAs by life expectancy, color-graded from red to green, with the user's ZIP highlighted and a percentile-based rank summary ("ranks #N of 63 — near the top of the county").

### Personal-factors calculators

Two literature-based calculators show how individual factors shift life expectancy independent of geography:

- **Smoking impact** — status (never/former/current) + age-at-quit + secondhand exposure + kids in household, using deltas from Doll & Peto (BMJ 2004) and the U.S. Surgeon General's 2014 report.
- **Compare across generations** — birth-year slider (1900-2022) over NCHS historical U.S. life expectancy data, compared to today's Travis County average.

### Explore the Map

A full interactive **choropleth map** powered by Leaflet lets you visually explore how health indicators vary across Travis County. Switch between indicators, hover for quick stats, or click any ZIP code for a detailed breakdown.

### Compare ZIP Codes

Select 2–3 ZIP codes to see them side-by-side with a **radar chart**, grouped bar charts, and a color-coded comparison table — making health disparities immediately visible.

### 60-second guided tour

A floating tour button opens a 4-step guided walkthrough of the app's core features. Persists "seen" state via localStorage; first-time visitors get a soft attention ring.

### Kiosk showcase mode

After 5 minutes of inactivity (auto-disabled on mobile and via `?kiosk=off`), an animated showcase overlay rotates through four slides: title, key statistics, an auto-rotating "Did you know?" insight panel that surfaces interesting cross-indicator facts (e.g. diabetes ratios between ZIP extremes), and a closing slide framing the AI-velocity story. Designed for conference booths and public health events.

### About panel — methodology + build story

A modal (centered on desktop, full-screen sheet on mobile) covers data sources, methodology, limitations, a per-session **build timeline**, and an **agency-cost comparison** that contextualizes the development effort.

---

## Data Sources

| Indicator                | Source                                                            | Vintage   |
| ------------------------ | ----------------------------------------------------------------- | --------- |
| Life Expectancy at Birth | [CDC USALEEP](https://www.cdc.gov/nchs/nvss/usaleep/usaleep.html) | 2010–2015 |
| Poverty Rate             | ACS 5-Year Estimates                                              | 2022      |
| Uninsured Rate           | ACS 5-Year Estimates                                              | 2022      |
| Diabetes Prevalence      | [CDC PLACES](https://www.cdc.gov/places/)                         | 2023      |
| Hypertension Prevalence  | CDC PLACES                                                        | 2023      |
| Obesity Prevalence       | CDC PLACES                                                        | 2023      |

Tract-level life expectancy data is aggregated to ZIP code (ZCTA) level using **population-weighted averages** via the HUD USPS-Tract crosswalk.

---

## Tech Stack

| Layer      | Technology                  |
| ---------- | --------------------------- |
| Framework  | React 19 + TypeScript 5.9   |
| Build      | Vite 8                      |
| Styling    | Tailwind CSS 4.2            |
| Routing    | React Router 7 (HashRouter) |
| Maps       | Leaflet + React Leaflet     |
| Charts     | Recharts                    |
| Font       | Geist (Google Fonts)        |
| Icons      | Material Symbols            |
| Deployment | GitHub Pages via Actions    |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+

### Install & Run

```bash
cd app
npm install
npm run dev
```

If a fresh install fails on peer-dep conflicts (Recharts vs React 19), use:

```bash
npm install --legacy-peer-deps
```

CI uses `npm ci --legacy-peer-deps` for the same reason.

The app will be available at `http://localhost:5173/APH-LE-Calc/`.

### Build for Production

```bash
cd app
npm run build
npm run preview
```

---

## Data Pipeline

Python scripts in `scripts/` handle data preparation:

| Script                    | Purpose                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `export_frontend_json.py` | Pulls CDC, ACS, and PLACES data; aggregates to ZCTA level; exports JSON for the frontend |
| `prepare_geojson.py`      | Downloads Census ZCTA boundary shapefiles, filters to Travis County, simplifies geometry |

Requirements: `pandas`, `geopandas`, `requests`, `numpy`

---

## Project Structure

```
├── app/
│   ├── public/data/          # Static health data JSON + GeoJSON boundaries
│   ├── src/
│   │   ├── components/
│   │   │   ├── neighborhood/  # ZIP lookup & life expectancy display
│   │   │   ├── explore/       # Choropleth map & detail cards
│   │   │   ├── compare/       # Multi-ZIP comparison (radar, bars, table)
│   │   │   ├── layout/        # App shell, header, navigation
│   │   │   ├── shared/        # Gauge charts, about drawer
│   │   │   └── showcase/      # Kiosk idle screen
│   │   ├── context/           # Health data React context
│   │   ├── hooks/             # Custom hooks (idle timer, animated numbers)
│   │   ├── lib/               # Constants, color scales, data loader
│   │   └── types/             # TypeScript type definitions
│   └── vite.config.ts
├── scripts/                   # Python data pipeline
├── .github/workflows/         # CI/CD deployment
└── README.md
```

---

## Methodology Notes

- Life expectancy estimates are **statistical estimates**, not individual predictions
- Within-ZIP variation can be significant — these are area-level averages
- CDC PLACES indicators use model-based small area estimation from BRFSS survey data
- USALEEP data reflects 2010–2015 mortality patterns; current conditions may differ

---

<p align="center">
  Built for <strong>Austin Public Health</strong> — City of Austin, Texas<br/>
  <sub>Promoting health equity through data transparency</sub>
</p>
