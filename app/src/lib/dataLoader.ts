import type { HealthDataStore, CountySummary } from "../types/health";
import type { FeatureCollection } from "geojson";

let cachedHealthData: HealthDataStore | null = null;
let cachedSummary: CountySummary | null = null;
let cachedBoundaries: FeatureCollection | null = null;

const BASE = import.meta.env.BASE_URL;

export async function loadHealthData(): Promise<HealthDataStore> {
  if (cachedHealthData) return cachedHealthData;
  const res = await fetch(`${BASE}data/zcta_health_data.json`);
  if (!res.ok) throw new Error(`Failed to load health data: ${res.status}`);
  cachedHealthData = await res.json();
  return cachedHealthData!;
}

export async function loadCountySummary(): Promise<CountySummary> {
  if (cachedSummary) return cachedSummary;
  const res = await fetch(`${BASE}data/county_summary.json`);
  if (!res.ok) throw new Error(`Failed to load county summary: ${res.status}`);
  cachedSummary = await res.json();
  return cachedSummary!;
}

export async function loadBoundaries(): Promise<FeatureCollection> {
  if (cachedBoundaries) return cachedBoundaries;
  const res = await fetch(`${BASE}data/zcta_boundaries.geojson`);
  if (!res.ok) throw new Error(`Failed to load boundaries: ${res.status}`);
  cachedBoundaries = await res.json();
  return cachedBoundaries!;
}

export async function loadAllData() {
  const [healthData, summary, boundaries] = await Promise.all([
    loadHealthData(),
    loadCountySummary(),
    loadBoundaries(),
  ]);
  return { healthData, summary, boundaries };
}
