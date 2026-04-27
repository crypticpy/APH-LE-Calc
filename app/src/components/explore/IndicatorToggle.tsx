import type { IndicatorKey } from "../../types/health";
import { INDICATOR_LABELS, INDICATOR_UNITS } from "../../types/health";

interface IndicatorToggleProps {
  selected: IndicatorKey;
  onChange: (indicator: IndicatorKey) => void;
}

const INDICATORS = Object.keys(INDICATOR_LABELS) as IndicatorKey[];

export default function IndicatorToggle({
  selected,
  onChange,
}: IndicatorToggleProps) {
  const unit = INDICATOR_UNITS[selected];
  const unitLabel = unit === "years" ? "years" : "percent of residents";

  return (
    <div
      className="absolute top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-72 max-w-sm bg-white rounded-xl shadow-lg border-2 border-aph-blue/30 overflow-hidden"
      style={{ zIndex: 1000 }}
    >
      {/* Header strip — makes the active indicator unmissable */}
      <div className="bg-aph-dark-blue text-white px-3 py-2 flex items-center gap-2">
        <span className="material-symbols-outlined text-base leading-none">
          map
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-90">
          Currently mapping
        </span>
      </div>

      <div className="px-3 py-3">
        <div className="text-base sm:text-lg font-bold text-aph-dark-blue leading-tight mb-0.5">
          {INDICATOR_LABELS[selected]}
        </div>
        <div className="text-[11px] text-aph-dark-gray mb-2">
          shown as {unitLabel}
        </div>

        <label className="block text-[10px] font-semibold uppercase tracking-wide text-aph-dark-gray mb-1">
          Switch indicator
        </label>
        <select
          value={selected}
          onChange={(e) => onChange(e.target.value as IndicatorKey)}
          className="w-full px-3 py-2 pr-8 text-sm font-semibold text-aph-dark-blue bg-aph-light-blue/40 border border-aph-blue/30 rounded-lg cursor-pointer hover:bg-aph-light-blue/60 focus:outline-none focus:ring-2 focus:ring-aph-blue/40 appearance-none transition"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%2322254E' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 10px center",
          }}
        >
          {INDICATORS.map((key) => (
            <option key={key} value={key}>
              {INDICATOR_LABELS[key]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
