import { useState, useMemo } from "react";
import {
  computeSmokingImpact,
  type SmokingStatus,
} from "../../lib/smokingDeltas";
import { APH_COLORS } from "../../lib/constants";

const STATUS_OPTIONS: { value: SmokingStatus; label: string }[] = [
  { value: "never", label: "Never smoked" },
  { value: "former", label: "Former smoker" },
  { value: "current", label: "Current smoker" },
];

export default function SmokingCalculator() {
  const [status, setStatus] = useState<SmokingStatus>("never");
  const [ageAtQuit, setAgeAtQuit] = useState(40);
  const [secondhand, setSecondhand] = useState(false);
  const [kidsInHome, setKidsInHome] = useState(false);

  const result = useMemo(
    () => computeSmokingImpact({ status, ageAtQuit, secondhand, kidsInHome }),
    [status, ageAtQuit, secondhand, kidsInHome],
  );

  const deltaColor =
    result.deltaYears === 0 ? APH_COLORS.green : APH_COLORS.red;

  return (
    <div className="bg-white rounded-2xl shadow-md border border-aph-light-gray/30 p-6 md:p-8">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-aph-blue">
          smoking_rooms
        </span>
        <h3 className="text-xl font-bold text-aph-dark-blue">
          Smoking & Life Expectancy
        </h3>
      </div>
      <p className="text-sm text-aph-dark-gray mb-5">
        Adjust the controls to see how smoking history affects estimated life
        expectancy.
      </p>

      {/* Smoking status segmented control */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-aph-dark-gray uppercase tracking-wide mb-2">
          Smoking status
        </p>
        <div
          role="radiogroup"
          className="grid grid-cols-3 gap-2 rounded-lg bg-aph-white p-1 border border-aph-light-gray/40"
        >
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              role="radio"
              aria-checked={status === opt.value}
              onClick={() => setStatus(opt.value)}
              className={`px-3 py-2 rounded-md text-sm font-semibold transition ${
                status === opt.value
                  ? "bg-aph-blue text-white shadow-sm"
                  : "text-aph-dark-blue hover:bg-aph-light-blue/40"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Age-at-quit slider (former smokers only) */}
      {status === "former" && (
        <div className="mb-4">
          <div className="flex items-baseline justify-between mb-1">
            <label
              htmlFor="age-at-quit"
              className="text-xs font-semibold text-aph-dark-gray uppercase tracking-wide"
            >
              Age you quit
            </label>
            <span className="text-aph-dark-blue font-bold text-lg">
              {ageAtQuit}
            </span>
          </div>
          <input
            id="age-at-quit"
            type="range"
            min={18}
            max={75}
            value={ageAtQuit}
            onChange={(e) => setAgeAtQuit(Number(e.target.value))}
            className="w-full accent-aph-blue"
          />
          <div className="flex justify-between text-xs text-aph-dark-gray mt-1">
            <span>18</span>
            <span>75</span>
          </div>
        </div>
      )}

      {/* Exposure checkboxes */}
      <div className="space-y-2 mb-5">
        <label className="flex items-center gap-3 text-sm text-aph-dark-blue cursor-pointer select-none">
          <input
            type="checkbox"
            checked={secondhand}
            onChange={(e) => setSecondhand(e.target.checked)}
            className="w-4 h-4 accent-aph-blue cursor-pointer"
          />
          I live with someone who smokes
        </label>
        <label className="flex items-center gap-3 text-sm text-aph-dark-blue cursor-pointer select-none">
          <input
            type="checkbox"
            checked={kidsInHome}
            onChange={(e) => setKidsInHome(e.target.checked)}
            className="w-4 h-4 accent-aph-blue cursor-pointer"
          />
          Children share the household
        </label>
      </div>

      {/* Result */}
      <div className="bg-aph-white rounded-xl p-4 border border-aph-light-gray/40">
        <div className="flex items-baseline gap-2">
          <p className="text-xs font-semibold text-aph-dark-gray uppercase tracking-wide">
            Estimated impact
          </p>
        </div>
        <div className="flex items-baseline gap-3 mt-1">
          <span
            className="text-4xl md:text-5xl font-bold leading-none tabular-nums transition-colors duration-300"
            style={{ color: deltaColor }}
          >
            {result.deltaYears === 0 ? "0" : `−${result.deltaYears.toFixed(1)}`}
          </span>
          <span className="text-aph-dark-gray text-base">
            years of life expectancy
          </span>
        </div>
        <p className="text-sm text-aph-dark-blue mt-3 leading-relaxed">
          {result.message}
        </p>
        {result.childrenNote && (
          <div className="mt-3 pt-3 border-t border-aph-light-gray/40 flex items-start gap-2">
            <span className="material-symbols-outlined text-aph-orange text-base mt-0.5 shrink-0">
              child_care
            </span>
            <p className="text-xs text-aph-dark-gray leading-relaxed">
              {result.childrenNote}
            </p>
          </div>
        )}
      </div>

      <p className="text-[11px] text-aph-dark-gray mt-3 leading-relaxed">
        Estimates from Doll &amp; Peto (BMJ 2004) and the U.S. Surgeon
        General&rsquo;s 2014 report. These are population-level averages; your
        individual outcome depends on many factors.
      </p>
    </div>
  );
}
