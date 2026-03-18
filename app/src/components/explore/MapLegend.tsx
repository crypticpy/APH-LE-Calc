import { useMemo } from "react";
import type { IndicatorKey } from "../../types/health";
import { INDICATOR_LABELS, INDICATOR_UNITS } from "../../types/health";
import { getColorForValue } from "../../lib/colorScales";
import { formatValue } from "../../lib/formatters";

interface MapLegendProps {
  indicator: IndicatorKey;
  min: number;
  max: number;
}

const GRADIENT_STEPS = 20;

export default function MapLegend({ indicator, min, max }: MapLegendProps) {
  const unit = INDICATOR_UNITS[indicator];

  const gradientCss = useMemo(() => {
    const stops: string[] = [];
    for (let i = 0; i <= GRADIENT_STEPS; i++) {
      const value = min + ((max - min) * i) / GRADIENT_STEPS;
      const color = getColorForValue(value, min, max, indicator);
      const pct = ((i / GRADIENT_STEPS) * 100).toFixed(1);
      stops.push(`${color} ${pct}%`);
    }
    return `linear-gradient(to right, ${stops.join(", ")})`;
  }, [indicator, min, max]);

  return (
    <div
      className="absolute bottom-6 left-4 bg-white rounded-xl shadow-lg border border-aph-light-gray/50 px-4 py-3"
      style={{ zIndex: 1000, minWidth: 200 }}
    >
      <p className="text-xs font-semibold text-aph-dark-blue mb-2">
        {INDICATOR_LABELS[indicator]}
      </p>

      {/* Gradient bar */}
      <div className="h-3 rounded-full" style={{ background: gradientCss }} />

      {/* Labels */}
      <div className="flex justify-between mt-1">
        <span className="text-[11px] text-aph-dark-gray">
          {formatValue(min, unit)}
        </span>
        <span className="text-[11px] text-aph-dark-gray">
          {formatValue(max, unit)}
        </span>
      </div>

      {/* Missing data indicator */}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-aph-light-gray/50">
        <div
          className="w-4 h-3 rounded-sm"
          style={{ backgroundColor: "#C6C5C4", opacity: 0.3 }}
        />
        <span className="text-[11px] text-aph-dark-gray">No data</span>
      </div>
    </div>
  );
}
