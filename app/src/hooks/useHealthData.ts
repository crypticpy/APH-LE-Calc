import { createContext, useContext } from "react";
import type { HealthDataStore, CountySummary } from "../types/health";
import type { FeatureCollection } from "geojson";

export interface HealthDataContextValue {
  healthData: HealthDataStore | null;
  summary: CountySummary | null;
  boundaries: FeatureCollection | null;
  loading: boolean;
  error: string | null;
}

export const HealthDataContext = createContext<HealthDataContextValue>({
  healthData: null,
  summary: null,
  boundaries: null,
  loading: true,
  error: null,
});

export function useHealthData() {
  return useContext(HealthDataContext);
}
