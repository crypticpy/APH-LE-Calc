import { useEffect, useRef, useState } from "react";
import { APH_COLORS } from "../../lib/constants";
import { getComparisonColor } from "../../lib/colorScales";
import { formatValue } from "../../lib/formatters";

export const INDICATOR_DESCRIPTIONS: Record<string, string> = {
  "Poverty Rate":
    "Percentage of residents living below the federal poverty level (ACS 2022)",
  "Uninsured Rate":
    "Percentage of civilian population without health insurance (ACS 2022)",
  "Diabetes Prevalence":
    "Estimated percentage of adults aged 18+ diagnosed with diabetes (CDC PLACES 2023)",
  "Hypertension Prevalence":
    "Estimated percentage of adults aged 18+ with high blood pressure (CDC PLACES 2023)",
  "Obesity Prevalence":
    "Estimated percentage of adults aged 18+ with BMI \u2265 30 (CDC PLACES 2023)",
};

interface GaugeChartProps {
  value: number | null;
  label: string;
  unit: string;
  countyAvg: number;
  min: number;
  max: number;
  higherIsBetter: boolean;
}

export default function GaugeChart({
  value,
  label,
  unit,
  countyAvg,
  min,
  max,
  higherIsBetter,
}: GaugeChartProps) {
  const [animatedFraction, setAnimatedFraction] = useState(0);
  const rafRef = useRef<number>(0);

  // Handle edge case: min equals max — treat as 50% fill
  const effectiveRange = max - min;
  const isDegenerate = effectiveRange === 0;
  const range = isDegenerate ? 1 : effectiveRange;

  const targetFraction =
    value !== null
      ? isDegenerate
        ? 0.5
        : Math.max(0, Math.min(1, (value - min) / range))
      : 0;

  // Clamp county avg marker to 0-1 range so it stays on the arc
  const avgFraction = isDegenerate
    ? 0.5
    : Math.max(0, Math.min(1, (countyAvg - min) / range));

  // Animate the gauge fill on mount / value change
  useEffect(() => {
    if (value === null) {
      setAnimatedFraction(0);
      return;
    }

    const start = performance.now();
    const duration = 800;

    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedFraction(targetFraction * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, targetFraction]);

  // SVG geometry — semicircle from 180deg to 0deg (left to right)
  const cx = 100;
  const cy = 90;
  const r = 70;
  const strokeWidth = 14;

  // Convert fraction (0-1) to angle on the semicircle (PI to 0)
  function fractionToPoint(f: number) {
    // Clamp to [0, 1] to keep marker on the arc boundary
    const clamped = Math.max(0, Math.min(1, f));
    const angle = Math.PI * (1 - clamped); // PI = left (0%), 0 = right (100%)
    return {
      x: cx + r * Math.cos(angle),
      y: cy - r * Math.sin(angle),
    };
  }

  // Build the arc path for the filled portion
  function arcPath(fraction: number): string {
    // Clamp fraction to valid range and handle boundary
    const clamped = Math.max(0, Math.min(1, fraction));
    if (clamped <= 0) return "";
    const startAngle = Math.PI;
    const endAngle = Math.PI * (1 - clamped);
    const start = {
      x: cx + r * Math.cos(startAngle),
      y: cy - r * Math.sin(startAngle),
    };
    const end = {
      x: cx + r * Math.cos(endAngle),
      y: cy - r * Math.sin(endAngle),
    };
    const largeArc = clamped > 0.5 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  }

  const fillColor =
    value !== null
      ? getComparisonColor(value, countyAvg, higherIsBetter)
      : APH_COLORS.lightGray;

  const avgPoint = fractionToPoint(avgFraction);

  // Difference text
  const diffText =
    value !== null
      ? (() => {
          const diff = value - countyAvg;
          const sign = diff > 0 ? "+" : "";
          const formatted =
            unit === "years"
              ? diff.toFixed(1)
              : diff.toFixed(1) + (unit === "%" ? "pp" : "");
          return `${sign}${formatted} vs avg`;
        })()
      : "";

  const tooltipText = INDICATOR_DESCRIPTIONS[label] ?? null;

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm border border-aph-light-gray/40">
      <svg viewBox="0 0 200 120" className="w-full max-w-[200px]">
        {/* Background arc */}
        <path
          d={arcPath(1)}
          fill="none"
          stroke={APH_COLORS.lightGray}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Filled arc */}
        {value !== null && animatedFraction > 0 && (
          <path
            d={arcPath(animatedFraction)}
            fill="none"
            stroke={fillColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}

        {/* County average marker */}
        {value !== null && (
          <g>
            <line
              x1={avgPoint.x}
              y1={avgPoint.y - 12}
              x2={avgPoint.x}
              y2={avgPoint.y + 12}
              stroke={APH_COLORS.darkBlue}
              strokeWidth={2.5}
              strokeLinecap="round"
              transform={`rotate(${-(Math.acos(Math.max(-1, Math.min(1, (avgPoint.x - cx) / r))) * 180) / Math.PI + 90}, ${avgPoint.x}, ${avgPoint.y})`}
            />
            {/* Small diamond marker */}
            <circle
              cx={avgPoint.x}
              cy={avgPoint.y}
              r={4}
              fill={APH_COLORS.darkBlue}
            />
          </g>
        )}

        {/* Center value */}
        {value !== null ? (
          <text
            x={cx}
            y={cy - 8}
            textAnchor="middle"
            className="font-geist"
            fill={APH_COLORS.darkBlue}
            fontSize="26"
            fontWeight="700"
          >
            {formatValue(value, unit)}
          </text>
        ) : (
          <text
            x={cx}
            y={cy - 12}
            textAnchor="middle"
            className="font-geist"
            fill={APH_COLORS.darkGray}
            fontSize="12"
            fontWeight="500"
          >
            Data Not
          </text>
        )}

        {value === null && (
          <text
            x={cx}
            y={cy + 4}
            textAnchor="middle"
            className="font-geist"
            fill={APH_COLORS.darkGray}
            fontSize="12"
            fontWeight="500"
          >
            Available
          </text>
        )}

        {/* Min/Max labels */}
        <text
          x={cx - r - 2}
          y={cy + 16}
          textAnchor="middle"
          fill={APH_COLORS.darkGray}
          fontSize="9"
        >
          {formatValue(min, unit)}
        </text>
        <text
          x={cx + r + 2}
          y={cy + 16}
          textAnchor="middle"
          fill={APH_COLORS.darkGray}
          fontSize="9"
        >
          {formatValue(max, unit)}
        </text>
      </svg>

      {/* Label with info tooltip */}
      <div className="flex items-center gap-1 mt-1 justify-center">
        <p className="text-sm font-semibold text-aph-dark-blue text-center">
          {label}
        </p>
        {tooltipText && (
          <span className="relative group cursor-help">
            <span
              className="material-symbols-outlined text-aph-dark-gray/60 hover:text-aph-blue transition"
              style={{ fontSize: "14px" }}
            >
              info
            </span>
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 rounded-lg bg-aph-dark-blue text-white text-xs px-3 py-2 leading-snug opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg z-20 text-center">
              {tooltipText}
              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-aph-dark-blue" />
            </span>
          </span>
        )}
      </div>

      {/* Difference vs county avg */}
      {value !== null ? (
        <p className="text-xs mt-0.5 text-center" style={{ color: fillColor }}>
          {diffText}
        </p>
      ) : (
        <p className="text-xs mt-0.5 text-aph-dark-gray text-center">
          No data for this area
        </p>
      )}
    </div>
  );
}
