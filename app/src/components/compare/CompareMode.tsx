import { useState, useCallback } from "react";
import { APH_COLORS } from "../../lib/constants";
import ZctaPicker from "./ZctaPicker";
import RadarChart from "./RadarChart";
import ComparisonBarChart from "./ComparisonBarChart";
import ComparisonTable from "./ComparisonTable";

const COMPARISON_COLORS = [
  APH_COLORS.blue,
  APH_COLORS.green,
  APH_COLORS.orange,
];

const MAX_SELECTIONS = 3;

export default function CompareMode() {
  const [selectedZctas, setSelectedZctas] = useState<string[]>([]);

  const handleAdd = useCallback((zcta: string) => {
    setSelectedZctas((prev) => {
      if (prev.includes(zcta) || prev.length >= MAX_SELECTIONS) return prev;
      return [...prev, zcta];
    });
  }, []);

  const handleRemove = useCallback((zcta: string) => {
    setSelectedZctas((prev) => prev.filter((z) => z !== zcta));
  }, []);

  const hasComparison = selectedZctas.length >= 2;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-aph-dark-blue">
          Compare Zip Codes
        </h1>
        <p className="text-aph-dark-gray mt-2 text-sm sm:text-base">
          Select 2-3 Travis County zip codes to compare health indicators side
          by side.
        </p>
      </div>

      {/* ZCTA Picker */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-aph-dark-blue mb-3">
          Select Zip Codes
        </h2>
        <ZctaPicker
          selectedZctas={selectedZctas}
          onAdd={handleAdd}
          onRemove={handleRemove}
          maxSelections={MAX_SELECTIONS}
        />
        {selectedZctas.length === 1 && (
          <p className="text-sm text-aph-dark-gray mt-3">
            <span className="material-symbols-outlined text-sm align-text-bottom mr-1">
              info
            </span>
            Add at least one more zip code to see the comparison.
          </p>
        )}
      </div>

      {/* Comparison visualizations */}
      {hasComparison && (
        <div className="flex flex-col gap-8">
          {/* Radar chart */}
          <RadarChart zctas={selectedZctas} colors={COMPARISON_COLORS} />

          {/* Bar charts */}
          <ComparisonBarChart
            zctas={selectedZctas}
            colors={COMPARISON_COLORS}
          />

          {/* Table */}
          <ComparisonTable zctas={selectedZctas} colors={COMPARISON_COLORS} />
        </div>
      )}

      {/* Empty state */}
      {selectedZctas.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-aph-blue/40 mb-4 block">
            compare_arrows
          </span>
          <h3 className="text-lg font-semibold text-aph-dark-blue mb-2">
            No Zip Codes Selected
          </h3>
          <p className="text-sm text-aph-dark-gray max-w-md mx-auto">
            Start by typing a Travis County zip code above. Select 2-3 zip codes
            to see radar charts, bar charts, and a detailed comparison table.
          </p>
        </div>
      )}
    </div>
  );
}
