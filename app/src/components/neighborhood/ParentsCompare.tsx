import { useState, useMemo } from "react";
import { useHealthData } from "../../hooks/useHealthData";
import {
  lifeExpectancyForBirthYear,
  HISTORICAL_LE_MIN_YEAR,
  HISTORICAL_LE_MAX_YEAR,
} from "../../lib/historicalLE";
import { APH_COLORS } from "../../lib/constants";

export default function ParentsCompare() {
  const { healthData } = useHealthData();
  const [birthYear, setBirthYear] = useState(1960);

  const parentLE = useMemo(
    () => lifeExpectancyForBirthYear(birthYear),
    [birthYear],
  );
  const todayLE = healthData?.meta.countyAverage.lifeExpectancy ?? null;
  const gain =
    parentLE !== null && todayLE !== null ? todayLE - parentLE : null;

  return (
    <div className="bg-white rounded-2xl shadow-md border border-aph-light-gray/30 p-6 md:p-8">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-aph-blue">
          family_restroom
        </span>
        <h3 className="text-xl font-bold text-aph-dark-blue">
          Compare Across Generations
        </h3>
      </div>
      <p className="text-sm text-aph-dark-gray mb-5">
        How much has life expectancy changed since your parents or grandparents
        were born?
      </p>

      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-1">
          <label
            htmlFor="birth-year"
            className="text-xs font-semibold text-aph-dark-gray uppercase tracking-wide"
          >
            Birth year
          </label>
          <span className="text-aph-dark-blue font-bold text-lg">
            {birthYear}
          </span>
        </div>
        <input
          id="birth-year"
          type="range"
          min={HISTORICAL_LE_MIN_YEAR}
          max={HISTORICAL_LE_MAX_YEAR}
          value={birthYear}
          onChange={(e) => setBirthYear(Number(e.target.value))}
          className="w-full accent-aph-blue"
        />
        <div className="flex justify-between text-xs text-aph-dark-gray mt-1">
          <span>{HISTORICAL_LE_MIN_YEAR}</span>
          <span>{HISTORICAL_LE_MAX_YEAR}</span>
        </div>
      </div>

      {parentLE !== null && (
        <div className="bg-aph-white rounded-xl p-4 border border-aph-light-gray/40">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-aph-dark-gray uppercase tracking-wide mb-1">
                Born in {birthYear}
              </p>
              <p
                className="text-3xl font-bold leading-none"
                style={{ color: APH_COLORS.darkBlue }}
              >
                {parentLE.toFixed(1)}
              </p>
              <p className="text-xs text-aph-dark-gray mt-1">years (US avg)</p>
            </div>
            {todayLE !== null && (
              <div>
                <p className="text-xs font-semibold text-aph-dark-gray uppercase tracking-wide mb-1">
                  Travis County today
                </p>
                <p
                  className="text-3xl font-bold leading-none"
                  style={{ color: APH_COLORS.green }}
                >
                  {todayLE.toFixed(1)}
                </p>
                <p className="text-xs text-aph-dark-gray mt-1">years</p>
              </div>
            )}
          </div>
          {gain !== null && (
            <p className="text-sm text-aph-dark-blue mt-4 leading-relaxed">
              Travis County residents today live about{" "}
              <span className="font-bold" style={{ color: APH_COLORS.green }}>
                {gain >= 0 ? "+" : ""}
                {gain.toFixed(1)} years
              </span>{" "}
              {gain >= 0 ? "longer" : "shorter"} than the U.S. average for
              someone born in {birthYear}.
            </p>
          )}
        </div>
      )}

      <p className="text-[11px] text-aph-dark-gray mt-3 leading-relaxed">
        Historical U.S. life expectancy at birth from CDC NCHS National Vital
        Statistics System. The 2020 dip reflects the COVID-19 pandemic.
      </p>
    </div>
  );
}
