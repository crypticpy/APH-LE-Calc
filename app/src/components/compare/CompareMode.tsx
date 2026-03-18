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
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-aph-dark-blue">
          Compare Zip Codes
        </h1>
        <p className="text-aph-dark-gray mt-2 text-sm sm:text-base max-w-2xl">
          How do health outcomes differ across Travis County neighborhoods?
          Select 2 or 3 zip codes below to see a side-by-side comparison of life
          expectancy, chronic disease, and socioeconomic indicators.
        </p>
      </div>

      {/* ZCTA Picker */}
      <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6 mb-8 border border-aph-light-gray/30">
        <ZctaPicker
          selectedZctas={selectedZctas}
          onAdd={handleAdd}
          onRemove={handleRemove}
          maxSelections={MAX_SELECTIONS}
        />
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

      {/* Empty state — only when no zips selected */}
      {selectedZctas.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-10 text-center border border-aph-light-gray/30">
          <span className="material-symbols-outlined text-5xl text-aph-blue/30 mb-4 block">
            compare_arrows
          </span>
          <h3 className="text-lg font-semibold text-aph-dark-blue mb-3">
            Ready to Compare
          </h3>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm text-aph-dark-gray max-w-lg mx-auto">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-aph-blue/10 text-aph-blue flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span>Pick a zip code above</span>
            </div>
            <span className="hidden sm:block material-symbols-outlined text-aph-light-gray text-lg">
              arrow_forward
            </span>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-aph-blue/10 text-aph-blue flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span>Add a 2nd to compare</span>
            </div>
            <span className="hidden sm:block material-symbols-outlined text-aph-light-gray text-lg">
              arrow_forward
            </span>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-aph-blue/10 text-aph-blue flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span>See the results</span>
            </div>
          </div>
        </div>
      )}

      {/* Waiting for second zip */}
      {selectedZctas.length === 1 && (
        <div className="bg-aph-light-blue/30 rounded-xl p-5 sm:p-6 text-center border border-aph-blue/15">
          <span className="material-symbols-outlined text-3xl text-aph-blue/60 mb-2 block">
            pending
          </span>
          <p className="text-sm text-aph-dark-blue font-medium">
            Add one more zip code to see the comparison charts and table.
          </p>
        </div>
      )}
    </div>
  );
}
