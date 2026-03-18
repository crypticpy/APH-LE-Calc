import type { IndicatorKey } from "../../types/health";
import { INDICATOR_LABELS } from "../../types/health";

interface IndicatorToggleProps {
  selected: IndicatorKey;
  onChange: (indicator: IndicatorKey) => void;
}

const INDICATORS = Object.keys(INDICATOR_LABELS) as IndicatorKey[];

export default function IndicatorToggle({
  selected,
  onChange,
}: IndicatorToggleProps) {
  return (
    <div
      className="absolute top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-auto max-w-xs bg-white rounded-xl shadow-lg border border-aph-light-gray/50 px-1 py-1"
      style={{ zIndex: 1000 }}
    >
      <label className="block px-3 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-aph-dark-gray">
        Health Indicator
      </label>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value as IndicatorKey)}
        className="w-full px-3 py-2 pr-8 text-sm font-semibold text-aph-dark-blue bg-white border-0 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-aph-blue/40 appearance-none"
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
  );
}
