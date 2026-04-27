import { useMemo, useState } from "react";
import { APH_COLORS } from "../../lib/constants";
import {
  computeLifespan,
  defaultInputs,
  topImprovements,
  bmiFromHeightWeight,
  bmiCategory,
  type LifespanInputs,
  type Sex,
  type DietScore,
  type StressScore,
} from "../../lib/lifespanModel";
import type { SmokingStatus } from "../../lib/smokingDeltas";
import FactorWaterfall from "./FactorWaterfall";
import ServiceMatchCTA from "./ServiceMatchCTA";

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: "unspecified", label: "Prefer not to say" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

const SMOKING_OPTIONS: { value: SmokingStatus; label: string }[] = [
  { value: "never", label: "Never" },
  { value: "former", label: "Former" },
  { value: "current", label: "Current" },
];

const DIET_LABELS: Record<DietScore, string> = {
  1: "Mostly fast food / processed",
  2: "Some home cooking, lots of red meat & sugar",
  3: "Typical American mix",
  4: "Mostly whole foods, some red meat",
  5: "Mediterranean-style: vegetables, fish, whole grains",
};

const STRESS_LABELS: Record<StressScore, string> = {
  1: "Rarely stressed",
  2: "Occasionally stressed",
  3: "Moderately stressed",
  4: "Often stressed",
  5: "Constantly stressed",
};

interface SectionProps {
  title: string;
  children: React.ReactNode;
}
function Section({ title, children }: SectionProps) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-aph-dark-gray uppercase tracking-wide mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}
function Segmented<T extends string>({
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      className="grid gap-2 rounded-lg bg-aph-white p-1 border border-aph-light-gray/40"
      style={{
        gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
      }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-2 rounded-md text-sm font-semibold transition ${
            value === opt.value
              ? "bg-aph-blue text-white shadow-sm"
              : "text-aph-dark-blue hover:bg-aph-light-blue/40"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  display: string;
  onChange: (v: number) => void;
}
function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  display,
  onChange,
}: SliderProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-sm text-aph-dark-blue font-medium">
          {label}
        </label>
        <span className="text-aph-dark-blue font-bold text-base tabular-nums">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-aph-blue"
      />
    </div>
  );
}

export default function LifespanCalculator() {
  const [inputs, setInputs] = useState<LifespanInputs>(defaultInputs());
  const [heightFt, setHeightFt] = useState(5);
  const [heightIn, setHeightIn] = useState(8);
  const [weightLb, setWeightLb] = useState(160);

  // Recompute BMI whenever h/w change.
  function syncBmi(ft: number, inch: number, lb: number) {
    const totalIn = ft * 12 + inch;
    const bmi = bmiFromHeightWeight(totalIn, lb);
    setInputs((prev) => ({ ...prev, bmi: Math.round(bmi * 10) / 10 }));
  }

  const result = useMemo(() => computeLifespan(inputs), [inputs]);
  const improvements = useMemo(() => topImprovements(inputs, 3), [inputs]);

  const update = <K extends keyof LifespanInputs>(
    key: K,
    value: LifespanInputs[K],
  ) => setInputs((prev) => ({ ...prev, [key]: value }));

  const totalDeltaColor =
    result.totalDelta >= 0 ? APH_COLORS.green : APH_COLORS.red;
  const projectedAge = Math.round(result.totalLifespan);

  return (
    <div className="bg-white rounded-2xl shadow-md border border-aph-light-gray/30 p-6 md:p-8">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-aph-blue">
          calculate
        </span>
        <h3 className="text-xl font-bold text-aph-dark-blue">
          Personalized Lifespan Estimator
        </h3>
      </div>
      <p className="text-sm text-aph-dark-gray mb-5">
        Combines your age with six modifiable factors from large prospective
        cohort studies. Move any control to see how it changes the estimate.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ------------------ Inputs column ------------------ */}
        <div>
          <Section title="About you">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-aph-dark-gray">Age</label>
                <input
                  type="number"
                  min={18}
                  max={100}
                  value={inputs.age}
                  onChange={(e) =>
                    update(
                      "age",
                      Math.max(18, Math.min(100, Number(e.target.value) || 0)),
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg border border-aph-light-gray bg-white text-aph-dark-blue font-semibold focus:outline-none focus:ring-2 focus:ring-aph-blue [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
            <Segmented
              value={inputs.sex}
              options={SEX_OPTIONS}
              onChange={(v) => update("sex", v)}
            />
          </Section>

          <Section title="Smoking">
            <Segmented
              value={inputs.smokingStatus}
              options={SMOKING_OPTIONS}
              onChange={(v) => update("smokingStatus", v)}
            />
            {inputs.smokingStatus === "former" && (
              <div className="mt-3">
                <Slider
                  label="Age you quit"
                  value={inputs.ageAtQuit}
                  min={18}
                  max={Math.max(75, inputs.age)}
                  display={`${inputs.ageAtQuit}`}
                  onChange={(v) => update("ageAtQuit", v)}
                />
              </div>
            )}
            <label className="flex items-center gap-2 mt-3 text-sm text-aph-dark-blue cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inputs.secondhand}
                onChange={(e) => update("secondhand", e.target.checked)}
                className="w-4 h-4 accent-aph-blue cursor-pointer"
              />
              I live with someone who smokes
            </label>
          </Section>

          <Section title="Physical activity">
            <Slider
              label="Moderate exercise per week"
              value={inputs.exerciseMinutesPerWeek}
              min={0}
              max={600}
              step={15}
              display={`${inputs.exerciseMinutesPerWeek} min`}
              onChange={(v) => update("exerciseMinutesPerWeek", v)}
            />
            <p className="text-[11px] text-aph-dark-gray mt-1">
              WHO recommends ~150 min/week.
            </p>
          </Section>

          <Section title="Diet quality">
            <Slider
              label="Eating pattern"
              value={inputs.dietScore}
              min={1}
              max={5}
              display={`${inputs.dietScore} / 5`}
              onChange={(v) => update("dietScore", v as DietScore)}
            />
            <p className="text-[11px] text-aph-dark-gray mt-1 italic">
              {DIET_LABELS[inputs.dietScore]}
            </p>
          </Section>

          <Section title="Body mass index">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div>
                <label className="text-xs text-aph-dark-gray">
                  Height (ft)
                </label>
                <input
                  type="number"
                  min={3}
                  max={8}
                  value={heightFt}
                  onChange={(e) => {
                    const v = Math.max(
                      3,
                      Math.min(8, Number(e.target.value) || 0),
                    );
                    setHeightFt(v);
                    syncBmi(v, heightIn, weightLb);
                  }}
                  className="w-full px-2 py-1.5 rounded-lg border border-aph-light-gray bg-white text-aph-dark-blue font-semibold focus:outline-none focus:ring-2 focus:ring-aph-blue [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div>
                <label className="text-xs text-aph-dark-gray">
                  Height (in)
                </label>
                <input
                  type="number"
                  min={0}
                  max={11}
                  value={heightIn}
                  onChange={(e) => {
                    const v = Math.max(
                      0,
                      Math.min(11, Number(e.target.value) || 0),
                    );
                    setHeightIn(v);
                    syncBmi(heightFt, v, weightLb);
                  }}
                  className="w-full px-2 py-1.5 rounded-lg border border-aph-light-gray bg-white text-aph-dark-blue font-semibold focus:outline-none focus:ring-2 focus:ring-aph-blue [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div>
                <label className="text-xs text-aph-dark-gray">
                  Weight (lb)
                </label>
                <input
                  type="number"
                  min={50}
                  max={500}
                  value={weightLb}
                  onChange={(e) => {
                    const v = Math.max(
                      50,
                      Math.min(500, Number(e.target.value) || 0),
                    );
                    setWeightLb(v);
                    syncBmi(heightFt, heightIn, v);
                  }}
                  className="w-full px-2 py-1.5 rounded-lg border border-aph-light-gray bg-white text-aph-dark-blue font-semibold focus:outline-none focus:ring-2 focus:ring-aph-blue [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
            <p className="text-[11px] text-aph-dark-gray">
              BMI {inputs.bmi.toFixed(1)} — {bmiCategory(inputs.bmi)}
            </p>
          </Section>

          <Section title="Sleep">
            <Slider
              label="Average hours per night"
              value={inputs.sleepHours}
              min={3}
              max={11}
              step={0.5}
              display={`${inputs.sleepHours} hrs`}
              onChange={(v) => update("sleepHours", v)}
            />
          </Section>

          <Section title="Chronic stress">
            <Slider
              label="How often do you feel stressed?"
              value={inputs.stressScore}
              min={1}
              max={5}
              display={`${inputs.stressScore} / 5`}
              onChange={(v) => update("stressScore", v as StressScore)}
            />
            <p className="text-[11px] text-aph-dark-gray mt-1 italic">
              {STRESS_LABELS[inputs.stressScore]}
            </p>
          </Section>
        </div>

        {/* ------------------ Result column ------------------ */}
        <div className="space-y-5">
          <div
            className="rounded-2xl p-6 text-center text-white"
            style={{
              background: `linear-gradient(135deg, ${APH_COLORS.darkBlue} 0%, ${APH_COLORS.blue} 100%)`,
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
              Estimated lifespan
            </p>
            <p className="text-6xl font-bold leading-none mt-2 tabular-nums">
              {result.totalLifespan.toFixed(1)}
            </p>
            <p className="text-white/80 mt-1">years</p>
            <div className="grid grid-cols-2 gap-3 mt-5 text-left">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
                  Years remaining
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {result.remainingYears.toFixed(0)}
                </p>
                <p className="text-[11px] text-white/70 mt-0.5">
                  Reaching about age {projectedAge}
                </p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
                  Net adjustment
                </p>
                <p
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: totalDeltaColor }}
                >
                  {result.totalDelta >= 0 ? "+" : "−"}
                  {Math.abs(result.totalDelta).toFixed(1)}
                </p>
                <p className="text-[11px] text-white/70 mt-0.5">
                  vs. average for your age
                </p>
              </div>
            </div>
          </div>

          <FactorWaterfall
            factors={result.factors}
            baseline={result.baselineLifespan}
            total={result.totalLifespan}
          />

          <ServiceMatchCTA opportunities={improvements} />
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-aph-light-gray/40">
        <p className="text-[11px] text-aph-dark-gray leading-relaxed">
          Estimates combine the U.S. 2022 life table (NCHS) with effect sizes
          from Doll &amp; Peto (BMJ 2004), Lee et al. (Lancet 2012), Fadnes et
          al. (PLoS Med 2022), the Prospective Studies Collaboration (Lancet
          2009), Cappuccio et al. (Sleep 2010), and Russ et al. (BMJ 2012).
          These are population-level averages, not individual predictions.
        </p>
      </div>
    </div>
  );
}
