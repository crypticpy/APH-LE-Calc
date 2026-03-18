import { useState } from "react";
import type { IndicatorKey } from "../../types/health";
import { useHealthData } from "../../hooks/useHealthData";
import ChoroplethMap from "./ChoroplethMap";
import IndicatorToggle from "./IndicatorToggle";
import MapLegend from "./MapLegend";
import ZctaPopupCard from "./ZctaPopupCard";

export default function ExploreMode() {
  const [indicator, setIndicator] = useState<IndicatorKey>("lifeExpectancy");
  const [selectedZcta, setSelectedZcta] = useState<string | null>(null);
  const { summary, loading, error } = useHealthData();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-aph-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-aph-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-aph-dark-blue font-semibold text-sm">
            Loading map data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-aph-white">
        <p className="text-aph-red">{error}</p>
      </div>
    );
  }

  const indicatorSummary = summary?.indicators[indicator];

  return (
    <div
      className="relative overflow-hidden flex-1"
      style={{ height: "calc(100dvh - 8rem)", minHeight: "300px" }}
    >
      {/* Full-bleed map */}
      <ChoroplethMap
        indicator={indicator}
        onZctaSelect={setSelectedZcta}
        selectedZcta={selectedZcta}
      />

      {/* Floating indicator selector — top-right */}
      <IndicatorToggle selected={indicator} onChange={setIndicator} />

      {/* Floating legend — bottom-left */}
      {indicatorSummary && (
        <MapLegend
          indicator={indicator}
          min={indicatorSummary.min}
          max={indicatorSummary.max}
        />
      )}

      {/* Slide-in detail card */}
      <ZctaPopupCard
        zcta={selectedZcta}
        onClose={() => setSelectedZcta(null)}
      />
    </div>
  );
}
