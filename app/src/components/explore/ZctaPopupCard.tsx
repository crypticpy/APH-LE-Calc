import type { IndicatorKey } from "../../types/health";
import {
  INDICATOR_LABELS,
  INDICATOR_UNITS,
  INDICATOR_HIGHER_IS_BETTER,
} from "../../types/health";
import { useHealthData } from "../../hooks/useHealthData";
import { formatValue, formatDifference } from "../../lib/formatters";
import { getComparisonColor } from "../../lib/colorScales";
import { APH_COLORS } from "../../lib/constants";

interface ZctaPopupCardProps {
  zcta: string | null;
  onClose: () => void;
}

const BAR_INDICATORS: IndicatorKey[] = [
  "povertyRate",
  "uninsuredRate",
  "diabetes",
  "hypertension",
  "obesity",
];

export default function ZctaPopupCard({ zcta, onClose }: ZctaPopupCardProps) {
  const { healthData, summary } = useHealthData();

  if (!zcta) return null;

  const data = healthData?.zctas[zcta];
  const countyAvg = healthData?.meta?.countyAverage;

  if (!data) {
    return (
      <Card zcta={zcta} onClose={onClose}>
        <p className="text-sm text-aph-dark-gray py-4">
          No health data available for this area.
        </p>
      </Card>
    );
  }

  const lifeExpVal = data.lifeExpectancy;

  return (
    <Card zcta={zcta} onClose={onClose}>
      {/* Life Expectancy hero stat */}
      <div className="bg-aph-light-blue/40 rounded-lg p-4 mb-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-aph-dark-gray mb-1">
          Life Expectancy
        </p>
        <p className="text-3xl font-bold text-aph-dark-blue">
          {formatValue(lifeExpVal, "years")}
        </p>
        {lifeExpVal !== null && countyAvg && (
          <p
            className="text-xs mt-1"
            style={{
              color: getComparisonColor(
                lifeExpVal,
                countyAvg.lifeExpectancy,
                true,
              ),
            }}
          >
            {formatDifference(
              lifeExpVal,
              countyAvg.lifeExpectancy,
              "years",
              true,
            )}
          </p>
        )}
      </div>

      {/* Mini bar charts */}
      <div className="space-y-3">
        {BAR_INDICATORS.map((key) => {
          const value = data[key] as number | null;
          const avg = countyAvg?.[key] ?? null;
          const indSummary = summary?.indicators[key];
          const label = INDICATOR_LABELS[key];
          const unit = INDICATOR_UNITS[key];
          const higherIsBetter = INDICATOR_HIGHER_IS_BETTER[key];

          // Determine bar width as percentage of indicator max
          const barMax = indSummary?.max ?? 100;
          const barPct =
            value !== null ? Math.min(100, (value / barMax) * 100) : 0;
          const avgPct = avg !== null ? Math.min(100, (avg / barMax) * 100) : 0;

          const barColor =
            value !== null && avg !== null
              ? getComparisonColor(value, avg, higherIsBetter)
              : APH_COLORS.lightGray;

          return (
            <div key={key}>
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs font-medium text-aph-dark-blue">
                  {label}
                </span>
                <span className="text-xs font-semibold text-aph-dark-gray">
                  {formatValue(value, unit)}
                </span>
              </div>
              <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                {/* Value bar */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                  style={{
                    width: `${barPct}%`,
                    backgroundColor: barColor,
                  }}
                />
                {/* County average marker */}
                {avg !== null && avgPct > 0 && (
                  <div
                    className="absolute top-[-2px] bottom-[-2px] w-0.5"
                    style={{
                      left: `${avgPct}%`,
                      backgroundColor: APH_COLORS.darkBlue,
                    }}
                    title={`County avg: ${formatValue(avg, unit)}`}
                  />
                )}
              </div>
              {value !== null && avg !== null && (
                <p className="text-[10px] mt-0.5" style={{ color: barColor }}>
                  {formatDifference(value, avg, unit, higherIsBetter)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* County average legend hint */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-aph-light-gray/40">
        <div
          className="w-0.5 h-4"
          style={{ backgroundColor: APH_COLORS.darkBlue }}
        />
        <span className="text-[10px] text-aph-dark-gray">County average</span>
      </div>
    </Card>
  );
}

/* ---- Inner wrapper component ---- */
interface CardProps {
  zcta: string;
  onClose: () => void;
  children: React.ReactNode;
}

function Card({ zcta, onClose, children }: CardProps) {
  return (
    <>
      {/* Backdrop on mobile */}
      <div
        className="fixed inset-0 bg-black/20 md:hidden"
        style={{ zIndex: 1000 }}
        onClick={onClose}
      />

      {/* Card */}
      <div
        className="
          fixed md:absolute
          bottom-0 left-0 right-0
          max-h-[70vh] md:max-h-[calc(100%-2rem)]
          md:bottom-auto md:left-auto md:top-4 md:right-4
          md:w-80
          bg-white rounded-t-2xl md:rounded-xl shadow-2xl
          overflow-y-auto
          animate-slide-up md:animate-slide-left
        "
        style={{ zIndex: 1001 }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white px-5 py-4 flex items-center justify-between border-b border-aph-light-gray/30 z-10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-aph-dark-gray">
              ZIP Code Area
            </p>
            <h2 className="text-xl font-bold text-aph-dark-blue">{zcta}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-aph-light-gray/30 transition-colors text-aph-dark-gray"
            aria-label="Close detail panel"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">{children}</div>
      </div>
    </>
  );
}
