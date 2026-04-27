import { APH_COLORS } from "../../lib/constants";
import { FACTOR_ICONS, type FactorBreakdown } from "../../lib/lifespanModel";

interface FactorWaterfallProps {
  factors: FactorBreakdown[];
  baseline: number;
  total: number;
}

/**
 * Per-factor impact visualization. Each factor renders as a horizontal bar
 * extending left (loss) or right (gain) from a center axis, with the magnitude
 * sized against the largest absolute delta in the set.
 */
export default function FactorWaterfall({
  factors,
  baseline,
  total,
}: FactorWaterfallProps) {
  const maxAbs = Math.max(1, ...factors.map((f) => Math.abs(f.delta)));
  const sorted = [...factors].sort((a, b) => b.delta - a.delta);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-aph-light-gray/30 p-5 md:p-6">
      <h4 className="text-base font-semibold text-aph-dark-blue mb-1">
        How each factor changes your estimate
      </h4>
      <p className="text-xs text-aph-dark-gray mb-4">
        Years gained or lost vs. an average person of your age. Bars left of
        center reduce the estimate; bars to the right add to it.
      </p>

      <div className="space-y-3">
        {sorted.map((f) => {
          const pct = (Math.abs(f.delta) / maxAbs) * 50; // 0–50% of width
          const isPositive = f.delta > 0;
          const isZero = Math.abs(f.delta) < 0.05;
          const color = isPositive
            ? APH_COLORS.green
            : isZero
              ? APH_COLORS.lightGray
              : APH_COLORS.red;
          return (
            <div key={f.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-aph-dark-blue">
                  <span
                    className="material-symbols-outlined text-aph-blue"
                    style={{ fontSize: "18px" }}
                  >
                    {FACTOR_ICONS[f.key]}
                  </span>
                  {f.label}
                </span>
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color }}
                >
                  {isZero
                    ? "0.0 yrs"
                    : `${isPositive ? "+" : "−"}${Math.abs(f.delta).toFixed(1)} yrs`}
                </span>
              </div>
              <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                {/* Center axis */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-aph-dark-gray/40"
                  style={{ left: "50%" }}
                />
                {/* Bar */}
                {!isZero && (
                  <div
                    className="absolute top-0 bottom-0 transition-all duration-300"
                    style={{
                      backgroundColor: color,
                      left: isPositive ? "50%" : `${50 - pct}%`,
                      width: `${pct}%`,
                      borderRadius: isPositive
                        ? "0 9999px 9999px 0"
                        : "9999px 0 0 9999px",
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-aph-light-gray/40 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-aph-dark-gray">
            Avg. for your age
          </p>
          <p className="text-lg font-bold text-aph-dark-blue tabular-nums">
            {baseline.toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-aph-dark-gray">
            Net adjustment
          </p>
          <p
            className="text-lg font-bold tabular-nums"
            style={{
              color: total - baseline >= 0 ? APH_COLORS.green : APH_COLORS.red,
            }}
          >
            {total - baseline >= 0 ? "+" : "−"}
            {Math.abs(total - baseline).toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-aph-dark-gray">
            Your estimate
          </p>
          <p className="text-lg font-bold text-aph-dark-blue tabular-nums">
            {total.toFixed(1)}
          </p>
        </div>
      </div>
    </div>
  );
}
