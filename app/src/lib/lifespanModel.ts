/**
 * Personalized life expectancy model.
 *
 * Combines a U.S. baseline life expectancy lookup with per-factor deltas
 * derived from large prospective cohort studies. Used by the lifespan
 * calculator on the Neighborhood page.
 *
 * Sources for each factor delta are documented inline next to the function
 * that computes it. These are population-level estimates, not individual
 * predictions.
 *
 * High-level approach:
 *   total LE = baseline(age, sex) + sum(per-factor deltas)
 *
 * Each delta is signed: positive = years gained vs. a "typical American"
 * profile, negative = years lost. Deltas are anchored so a respondent who
 * matches the median U.S. adult on every factor lands near the published
 * U.S. LE for their age/sex.
 */

import type { SmokingStatus } from "./smokingDeltas";

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export type Sex = "female" | "male" | "unspecified";
export type DietScore = 1 | 2 | 3 | 4 | 5;
export type StressScore = 1 | 2 | 3 | 4 | 5;

export interface LifespanInputs {
  age: number;
  sex: Sex;
  smokingStatus: SmokingStatus;
  ageAtQuit: number; // ignored unless smokingStatus === "former"
  secondhand: boolean;
  exerciseMinutesPerWeek: number;
  dietScore: DietScore;
  sleepHours: number;
  bmi: number;
  stressScore: StressScore;
}

// ---------------------------------------------------------------------------
// Factor metadata
// ---------------------------------------------------------------------------

export type FactorKey =
  | "smoking"
  | "exercise"
  | "diet"
  | "bmi"
  | "sleep"
  | "stress";

export const FACTOR_LABELS: Record<FactorKey, string> = {
  smoking: "Smoking",
  exercise: "Physical activity",
  diet: "Diet quality",
  bmi: "Body mass index",
  sleep: "Sleep duration",
  stress: "Chronic stress",
};

export const FACTOR_ICONS: Record<FactorKey, string> = {
  smoking: "smoking_rooms",
  exercise: "directions_run",
  diet: "restaurant",
  bmi: "monitor_weight",
  sleep: "bedtime",
  stress: "self_improvement",
};

export const FACTOR_SOURCES: Record<FactorKey, string> = {
  smoking:
    "Doll & Peto, BMJ 2004; U.S. Surgeon General, The Health Consequences of Smoking — 50 Years of Progress, 2014.",
  exercise:
    "Lee et al., Lancet 2012; Arem et al., JAMA Intern Med 2015 (leisure-time activity and mortality).",
  diet: "Fadnes et al., PLoS Med 2022 (Estimating impact of food choices on life expectancy).",
  bmi: "Prospective Studies Collaboration, Lancet 2009 (BMI and cause-specific mortality, 900K participants).",
  sleep:
    "Cappuccio et al., Sleep 2010 (sleep duration and all-cause mortality meta-analysis).",
  stress:
    "Russ et al., BMJ 2012 (psychological distress, all-cause mortality, and cardiovascular disease).",
};

// ---------------------------------------------------------------------------
// Baseline life expectancy
// ---------------------------------------------------------------------------

/**
 * Period life-table life expectancy at exact age, both sexes combined.
 * Source: NCHS National Vital Statistics Reports, U.S. Life Tables, 2022
 * (released 2024). Values rounded to one decimal.
 */
const US_LE_2022_BOTH: Record<number, number> = {
  0: 77.5,
  10: 68.0,
  20: 58.4,
  30: 49.2,
  40: 40.0,
  50: 31.0,
  60: 22.7,
  70: 15.2,
  80: 8.9,
  90: 4.4,
  100: 2.3,
};

/** Sex differential at birth in U.S. 2022: women ~5.4 yrs longer. */
const SEX_DELTA_AT_BIRTH = 2.7; // ± from both-sexes value
const SEX_DELTA_DECAY_AGE = 90; // converges by ~90

function sexAdjustment(age: number, sex: Sex): number {
  if (sex === "unspecified") return 0;
  const decay = Math.max(0, 1 - age / SEX_DELTA_DECAY_AGE);
  const sign = sex === "female" ? 1 : -1;
  return sign * SEX_DELTA_AT_BIRTH * decay;
}

/** Linearly interpolate remaining years of life from the lookup. */
function remainingYears(age: number): number {
  const ages = Object.keys(US_LE_2022_BOTH)
    .map(Number)
    .sort((a, b) => a - b);
  if (age <= ages[0]) return US_LE_2022_BOTH[ages[0]];
  if (age >= ages[ages.length - 1])
    return US_LE_2022_BOTH[ages[ages.length - 1]];
  for (let i = 0; i < ages.length - 1; i++) {
    const a0 = ages[i];
    const a1 = ages[i + 1];
    if (age >= a0 && age <= a1) {
      const t = (age - a0) / (a1 - a0);
      return (
        US_LE_2022_BOTH[a0] + t * (US_LE_2022_BOTH[a1] - US_LE_2022_BOTH[a0])
      );
    }
  }
  return US_LE_2022_BOTH[ages[ages.length - 1]];
}

/**
 * Returns the projected total lifespan (current age + remaining years) for
 * an "average" person of this age/sex, before any factor deltas are applied.
 */
export function baselineLifespan(age: number, sex: Sex): number {
  const ex = remainingYears(age);
  return age + ex + sexAdjustment(age, sex);
}

// ---------------------------------------------------------------------------
// Factor deltas
// ---------------------------------------------------------------------------

/**
 * Smoking delta vs. a never-smoker with no secondhand exposure.
 *
 * Doll & Peto (BMJ 2004) — lifelong smokers lose ~10 years vs. never-smokers.
 * Quitting before 40 recovers most of the loss; later quits recover less.
 * Secondhand exposure: ~1 year LE loss for cohabiting non-smokers
 * (U.S. Surgeon General 2014, attributed mortality risk).
 */
function smokingDelta(input: LifespanInputs): number {
  const { smokingStatus, ageAtQuit, secondhand } = input;
  let d = 0;
  if (smokingStatus === "current") {
    d = -10;
  } else if (smokingStatus === "former") {
    if (ageAtQuit <= 30) d = 0;
    else if (ageAtQuit <= 40) d = -1;
    else if (ageAtQuit <= 50) d = -4;
    else if (ageAtQuit <= 60) d = -7;
    else d = -9;
  }
  if (secondhand) d -= 1;
  return d;
}

/**
 * Physical activity delta. Anchored to "no leisure-time activity" = 0.
 *
 * Lee et al. (Lancet 2012) — meeting WHO recommendations (~150 min/wk
 * moderate) is associated with ~3.4–4.5 yr LE gain vs. inactive. Arem et al.
 * (JAMA Intern Med 2015) — gains plateau at 3–5× recommended; modest
 * additional benefit beyond 300 min/wk, no harm signal up through ~10×.
 */
function exerciseDelta(input: LifespanInputs): number {
  const m = Math.max(0, input.exerciseMinutesPerWeek);
  // Piecewise linear curve through (0, 0), (75, 1.8), (150, 3.5),
  // (300, 4.2), (450+, 4.5).
  if (m === 0) return 0;
  if (m < 75) return (m / 75) * 1.8;
  if (m < 150) return 1.8 + ((m - 75) / 75) * 1.7;
  if (m < 300) return 3.5 + ((m - 150) / 150) * 0.7;
  if (m < 450) return 4.2 + ((m - 300) / 150) * 0.3;
  return 4.5;
}

/**
 * Diet delta. Anchored so score 3 (typical Western diet) = 0; better diets
 * gain years, worse diets lose them. Magnitudes scale down with age because
 * less remaining life is available to influence.
 *
 * Fadnes et al. (PLoS Med 2022) — switching from "typical Western" to
 * "Optimal" diet at age 20 adds ~10–13 yrs LE; at age 60 adds ~7–9 yrs;
 * at age 80 adds ~3–4 yrs. We use a smooth scaling.
 */
function dietDelta(input: LifespanInputs): number {
  const score = input.dietScore;
  const ageFactor = Math.max(0.25, 1 - input.age / 100);
  // Score 3 is reference; max gain ~+8 at younger ages, max loss ~-4.
  const tableYoung: Record<DietScore, number> = {
    1: -4,
    2: -2,
    3: 0,
    4: 4,
    5: 8,
  };
  return tableYoung[score] * ageFactor;
}

/**
 * BMI delta. Reference: BMI 22 (mid-normal) = 0.
 *
 * Prospective Studies Collaboration (Lancet 2009) — each 5 kg/m² above 25
 * raises mortality ~30%, translating to roughly 2–4 yrs LE loss; BMI 40+
 * carries ~8–10 yrs loss. Underweight (<18.5) shows ~2 yrs loss, partly
 * residual confounding from illness.
 */
function bmiDelta(input: LifespanInputs): number {
  const bmi = input.bmi;
  if (bmi < 16) return -3;
  if (bmi < 18.5) return -1.5;
  if (bmi < 25) return 0;
  if (bmi < 27.5) return -0.5;
  if (bmi < 30) return -1;
  if (bmi < 32.5) return -2.5;
  if (bmi < 35) return -3.5;
  if (bmi < 40) return -5;
  if (bmi < 45) return -7;
  return -9;
}

/**
 * Sleep delta. U-shape: 7–8 hrs is the protective range.
 *
 * Cappuccio et al. (Sleep 2010) — meta-analysis of 1.3M participants.
 * Short sleep (<6h) RR 1.12 all-cause mortality; long sleep (>9h) RR 1.30.
 * We translate these into ~1–3 yrs LE loss at extremes.
 */
function sleepDelta(input: LifespanInputs): number {
  const h = input.sleepHours;
  if (h < 4) return -3;
  if (h < 5) return -2;
  if (h < 6) return -1.2;
  if (h < 7) return -0.4;
  if (h <= 8) return 0;
  if (h < 9) return -0.5;
  if (h < 10) return -1.5;
  if (h < 11) return -2.5;
  return -3;
}

/**
 * Chronic stress delta.
 *
 * Russ et al. (BMJ 2012) — meta-analysis of 68k UK adults, sustained
 * psychological distress (GHQ-12 high) HR 1.16 all-cause, 1.29 CVD.
 * Translated to ~1–2 yrs LE at sustained-high distress; mild stress
 * (1–2 on a 5-point scale) shows no measurable harm.
 */
function stressDelta(input: LifespanInputs): number {
  switch (input.stressScore) {
    case 1:
      return 0.3;
    case 2:
      return 0;
    case 3:
      return -0.4;
    case 4:
      return -1.2;
    case 5:
      return -2;
  }
}

// ---------------------------------------------------------------------------
// Top-level compute
// ---------------------------------------------------------------------------

export interface FactorBreakdown {
  key: FactorKey;
  label: string;
  delta: number;
  source: string;
}

export interface LifespanResult {
  baselineLifespan: number;
  totalLifespan: number;
  remainingYears: number;
  totalDelta: number;
  factors: FactorBreakdown[];
}

const FACTOR_FNS: Record<FactorKey, (i: LifespanInputs) => number> = {
  smoking: smokingDelta,
  exercise: exerciseDelta,
  diet: dietDelta,
  bmi: bmiDelta,
  sleep: sleepDelta,
  stress: stressDelta,
};

export function computeLifespan(input: LifespanInputs): LifespanResult {
  const baseline = baselineLifespan(input.age, input.sex);
  const factors: FactorBreakdown[] = (
    Object.keys(FACTOR_FNS) as FactorKey[]
  ).map((key) => ({
    key,
    label: FACTOR_LABELS[key],
    delta: FACTOR_FNS[key](input),
    source: FACTOR_SOURCES[key],
  }));
  const totalDelta = factors.reduce((s, f) => s + f.delta, 0);
  const totalLifespan = Math.max(input.age, baseline + totalDelta);
  const remaining = Math.max(0, totalLifespan - input.age);
  return {
    baselineLifespan: baseline,
    totalLifespan,
    remainingYears: remaining,
    totalDelta,
    factors,
  };
}

// ---------------------------------------------------------------------------
// "Best-case" scenario + improvement opportunities
// ---------------------------------------------------------------------------

/**
 * Returns an "ideal" version of these inputs — what the model considers the
 * best modifiable profile (no smoking, ~300 min/wk exercise, top diet,
 * normal BMI, 7.5h sleep, low stress). Demographics (age, sex) are kept.
 */
export function idealizeInputs(input: LifespanInputs): LifespanInputs {
  return {
    ...input,
    smokingStatus:
      input.smokingStatus === "current" ? "former" : input.smokingStatus,
    ageAtQuit:
      input.smokingStatus === "current"
        ? Math.min(input.age, 40)
        : input.ageAtQuit,
    secondhand: false,
    exerciseMinutesPerWeek: 300,
    dietScore: 5,
    sleepHours: 7.5,
    bmi: input.bmi >= 18.5 && input.bmi < 25 ? input.bmi : 22,
    stressScore: 2,
  };
}

export interface ImprovementOpportunity {
  factor: FactorKey;
  label: string;
  currentDelta: number;
  potentialDelta: number;
  potentialGain: number; // years recoverable by improving this factor alone
}

/**
 * Identify the factors with the most years left on the table — i.e. where
 * the user's current delta is well below what they could achieve. Sorted
 * largest gain first. Returns at most `limit` opportunities, each with
 * gain >= 0.5 yrs (below that we don't surface it).
 */
export function topImprovements(
  input: LifespanInputs,
  limit = 3,
): ImprovementOpportunity[] {
  const ideal = idealizeInputs(input);
  const opportunities: ImprovementOpportunity[] = (
    Object.keys(FACTOR_FNS) as FactorKey[]
  ).map((key) => {
    const current = FACTOR_FNS[key](input);
    const potential = FACTOR_FNS[key](ideal);
    return {
      factor: key,
      label: FACTOR_LABELS[key],
      currentDelta: current,
      potentialDelta: potential,
      potentialGain: potential - current,
    };
  });
  return opportunities
    .filter((o) => o.potentialGain >= 0.5)
    .sort((a, b) => b.potentialGain - a.potentialGain)
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Helpers used by the UI
// ---------------------------------------------------------------------------

export function bmiFromHeightWeight(
  heightInches: number,
  weightPounds: number,
): number {
  if (heightInches <= 0 || weightPounds <= 0) return 0;
  return (weightPounds / (heightInches * heightInches)) * 703;
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  if (bmi < 35) return "Obese (Class I)";
  if (bmi < 40) return "Obese (Class II)";
  return "Obese (Class III)";
}

/** Default inputs used to seed the calculator UI. */
export function defaultInputs(): LifespanInputs {
  return {
    age: 35,
    sex: "unspecified",
    smokingStatus: "never",
    ageAtQuit: 40,
    secondhand: false,
    exerciseMinutesPerWeek: 90,
    dietScore: 3,
    sleepHours: 7,
    bmi: 25,
    stressScore: 3,
  };
}
