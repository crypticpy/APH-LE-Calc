import { useMemo } from "react";
import { useHealthData } from "../../hooks/useHealthData";
import { APH_COLORS } from "../../lib/constants";

interface DisparityStripProps {
  highlightZip: string;
}

interface ZipBar {
  zip: string;
  le: number;
  pct: number; // 0..1 — position relative to min/max
}

export default function DisparityStrip({ highlightZip }: DisparityStripProps) {
  const { healthData } = useHealthData();

  const { bars, minLE, maxLE, highlightIndex } = useMemo(() => {
    if (!healthData)
      return {
        bars: [] as ZipBar[],
        minLE: 0,
        maxLE: 0,
        highlightIndex: -1,
      };

    const entries: { zip: string; le: number }[] = [];
    for (const [zip, data] of Object.entries(healthData.zctas)) {
      if (data.lifeExpectancy != null) {
        entries.push({ zip, le: data.lifeExpectancy });
      }
    }
    entries.sort((a, b) => a.le - b.le);

    if (entries.length === 0)
      return {
        bars: [] as ZipBar[],
        minLE: 0,
        maxLE: 0,
        highlightIndex: -1,
      };

    const min = entries[0].le;
    const max = entries[entries.length - 1].le;
    const range = max - min || 1;

    const bars: ZipBar[] = entries.map((e) => ({
      zip: e.zip,
      le: e.le,
      pct: (e.le - min) / range,
    }));

    const idx = bars.findIndex((b) => b.zip === highlightZip);

    return { bars, minLE: min, maxLE: max, highlightIndex: idx };
  }, [healthData, highlightZip]);

  if (bars.length === 0) return null;

  const colorFor = (pct: number) => {
    // Red → orange → yellow → green gradient
    if (pct < 0.33) {
      // red to orange
      const t = pct / 0.33;
      return interpolate(APH_COLORS.red, APH_COLORS.orange, t);
    } else if (pct < 0.66) {
      const t = (pct - 0.33) / 0.33;
      return interpolate(APH_COLORS.orange, "#F2C94C", t);
    } else {
      const t = (pct - 0.66) / 0.34;
      return interpolate("#F2C94C", APH_COLORS.green, t);
    }
  };

  return (
    <section className="mb-6 rounded-xl bg-white shadow-sm p-5 border border-aph-light-gray/30">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-aph-blue text-lg">
          equalizer
        </span>
        <h4 className="text-sm font-semibold uppercase tracking-wide text-aph-dark-gray">
          Where {highlightZip} ranks among Travis County ZIPs
        </h4>
      </div>

      {/* Bar strip */}
      <div className="relative">
        <div
          className="flex items-end gap-[2px] h-20 sm:h-24"
          role="img"
          aria-label={`Sorted bar chart of ${bars.length} ZIP codes by life expectancy. ${highlightZip} ranks ${
            highlightIndex >= 0 ? highlightIndex + 1 : "unknown"
          } of ${bars.length}.`}
        >
          {bars.map((b, i) => {
            const isHighlight = b.zip === highlightZip;
            // Bar height: 30% min, 100% max
            const heightPct = 30 + b.pct * 70;
            return (
              <div
                key={b.zip}
                className="flex-1 relative transition-all"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: isHighlight
                    ? APH_COLORS.darkBlue
                    : colorFor(b.pct),
                  outline: isHighlight
                    ? `2px solid ${APH_COLORS.darkBlue}`
                    : undefined,
                  outlineOffset: isHighlight ? "1px" : undefined,
                  zIndex: isHighlight ? 2 : 1,
                  opacity: isHighlight ? 1 : 0.85,
                }}
                title={`${b.zip}: ${b.le.toFixed(1)} yrs`}
              >
                {isHighlight && (
                  <div
                    className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap shadow"
                    style={{ backgroundColor: APH_COLORS.darkBlue }}
                  >
                    {b.zip}
                    <div
                      className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45"
                      style={{ backgroundColor: APH_COLORS.darkBlue }}
                    />
                  </div>
                )}
                {/* Use index for unused-warning-free key handling */}
                <span className="sr-only">{i}</span>
              </div>
            );
          })}
        </div>

        {/* Axis labels */}
        <div className="flex justify-between mt-2 text-[11px] text-aph-dark-gray">
          <span>
            <span className="font-semibold text-aph-red">
              {minLE.toFixed(1)} yrs
            </span>{" "}
            shortest
          </span>
          <span className="hidden sm:inline">
            {bars.length} Travis County ZIPs
          </span>
          <span className="text-right">
            longest{" "}
            <span className="font-semibold text-aph-green">
              {maxLE.toFixed(1)} yrs
            </span>
          </span>
        </div>
      </div>

      {/* Rank summary */}
      {highlightIndex >= 0 && (
        <p className="text-sm text-aph-dark-blue mt-3 leading-relaxed">
          ZIP <span className="font-semibold">{highlightZip}</span> ranks{" "}
          <span className="font-bold text-aph-blue">#{highlightIndex + 1}</span>{" "}
          of {bars.length} — {percentileLabel(highlightIndex, bars.length)}.
        </p>
      )}
    </section>
  );
}

function interpolate(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function percentileLabel(index: number, total: number): string {
  // index 0 = lowest LE, index total-1 = highest
  const pct = index / (total - 1);
  if (pct >= 0.9) return "near the top of the county";
  if (pct >= 0.7) return "above the county middle";
  if (pct >= 0.4) return "around the county middle";
  if (pct >= 0.15) return "below the county middle";
  return "near the bottom of the county";
}
