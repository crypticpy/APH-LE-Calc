import { useState, useEffect } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { HealthDataContext } from "./hooks/useHealthData";
import { loadAllData } from "./lib/dataLoader";
import type { HealthDataStore, CountySummary } from "./types/health";
import type { FeatureCollection } from "geojson";
import AppShell from "./components/layout/AppShell";

export default function App() {
  const [healthData, setHealthData] = useState<HealthDataStore | null>(null);
  const [summary, setSummary] = useState<CountySummary | null>(null);
  const [boundaries, setBoundaries] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllData()
      .then(({ healthData, summary, boundaries }) => {
        setHealthData(healthData);
        setSummary(summary);
        setBoundaries(boundaries);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <HealthDataContext.Provider
      value={{ healthData, summary, boundaries, loading, error }}
    >
      <HashRouter>
        <Routes>
          <Route path="/*" element={<AppShell />} />
        </Routes>
      </HashRouter>
    </HealthDataContext.Provider>
  );
}
