export const APH_COLORS = {
  blue: "#44499C",
  green: "#009F4D",
  white: "#f7f6f5",
  darkBlue: "#22254E",
  darkGreen: "#005027",
  complaintGreen: "#008743",
  lightBlue: "#dcf2fd",
  lightGreen: "#dff0e3",
  red: "#F83125",
  orange: "#FF8F00",
  yellow: "#FFC600",
  cyan: "#009CDE",
  purple: "#9F3CC9",
  brown: "#8F5201",
  lightGray: "#C6C5C4",
  darkGray: "#636262",
} as const;

export const MAP_CONFIG = {
  center: [30.2672, -97.7431] as [number, number],
  zoom: 11,
  minZoom: 9,
  maxZoom: 16,
  tileUrl: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  tileAttribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
} as const;

export const AGE_GROUP_RANGES: Array<{
  key: string;
  min: number;
  max: number;
  label: string;
}> = [
  { key: "Under 1", min: 0, max: 0, label: "Under 1" },
  { key: "1-4", min: 1, max: 4, label: "1-4 years" },
  { key: "5-14", min: 5, max: 14, label: "5-14 years" },
  { key: "15-24", min: 15, max: 24, label: "15-24 years" },
  { key: "25-34", min: 25, max: 34, label: "25-34 years" },
  { key: "35-44", min: 35, max: 44, label: "35-44 years" },
  { key: "45-54", min: 45, max: 54, label: "45-54 years" },
  { key: "55-64", min: 55, max: 64, label: "55-64 years" },
  { key: "65-74", min: 65, max: 74, label: "65-74 years" },
  { key: "75-84", min: 75, max: 84, label: "75-84 years" },
  { key: "85 and older", min: 85, max: 120, label: "85+ years" },
];

/**
 * Base URL for the Austin Service Guide intake page. The lifespan calculator
 * deep-links into the service guide with `?event=healthspan&focus=<factors>`
 * so improvement opportunities flow into the resident services intake.
 * Override locally with `VITE_SERVICE_GUIDE_URL` if running both demos.
 */
export const SERVICE_GUIDE_URL =
  import.meta.env.VITE_SERVICE_GUIDE_URL ?? "http://localhost:5173";

export const IDLE_TIMEOUT_MS = 300_000; // 5 min — conference booth kiosk mode
export const IDLE_DISABLE_MOBILE_BREAKPOINT_PX = 768; // skip kiosk overlay on phones
export const IDLE_DISABLE_QUERY_FLAG = "kiosk=off"; // ?kiosk=off disables overlay (live demo escape hatch)

export const TRAVIS_COUNTY_ZCTAS = [
  "78610",
  "78613",
  "78617",
  "78620",
  "78621",
  "78634",
  "78640",
  "78641",
  "78642",
  "78644",
  "78645",
  "78646",
  "78652",
  "78653",
  "78660",
  "78664",
  "78669",
  "78676",
  "78681",
  "78701",
  "78702",
  "78703",
  "78704",
  "78705",
  "78712",
  "78717",
  "78719",
  "78721",
  "78722",
  "78723",
  "78724",
  "78725",
  "78726",
  "78727",
  "78728",
  "78729",
  "78730",
  "78731",
  "78732",
  "78733",
  "78734",
  "78735",
  "78736",
  "78737",
  "78738",
  "78739",
  "78741",
  "78742",
  "78744",
  "78745",
  "78746",
  "78747",
  "78748",
  "78749",
  "78750",
  "78751",
  "78752",
  "78753",
  "78754",
  "78756",
  "78757",
  "78758",
  "78759",
];
