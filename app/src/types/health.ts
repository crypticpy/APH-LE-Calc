export type AgeGroupKey =
  | "Under 1"
  | "1-4"
  | "5-14"
  | "15-24"
  | "25-34"
  | "35-44"
  | "45-54"
  | "55-64"
  | "65-74"
  | "75-84"
  | "85 and older";

export interface AgeSpecificData {
  ex: number;
  se: number;
}

export interface ZctaHealthData {
  lifeExpectancy: number | null;
  lifeExpectancySE: number | null;
  povertyRate: number | null;
  uninsuredRate: number | null;
  diabetes: number | null;
  hypertension: number | null;
  obesity: number | null;
  ageSpecific: Record<AgeGroupKey, AgeSpecificData> | null;
  dataQuality: "complete" | "partial" | "missing";
}

export interface CountyAverage {
  lifeExpectancy: number;
  povertyRate: number;
  uninsuredRate: number;
  diabetes: number;
  hypertension: number;
  obesity: number;
}

export interface HealthDataMeta {
  generated: string;
  sources: Record<string, string>;
  countyAverage: CountyAverage;
}

export interface HealthDataStore {
  zctas: Record<string, ZctaHealthData>;
  meta: HealthDataMeta;
}

export interface CountySummaryIndicator {
  min: number;
  max: number;
  avg: number;
  median: number;
  p25: number;
  p75: number;
  unit: string;
  higherIsBetter: boolean;
}

export interface CountySummary {
  indicators: {
    lifeExpectancy: CountySummaryIndicator;
    povertyRate: CountySummaryIndicator;
    uninsuredRate: CountySummaryIndicator;
    diabetes: CountySummaryIndicator;
    hypertension: CountySummaryIndicator;
    obesity: CountySummaryIndicator;
  };
  totalZctas: number;
  zctasWithCompleteData: number;
}

export type IndicatorKey =
  | "lifeExpectancy"
  | "povertyRate"
  | "uninsuredRate"
  | "diabetes"
  | "hypertension"
  | "obesity";

export const INDICATOR_LABELS: Record<IndicatorKey, string> = {
  lifeExpectancy: "Life Expectancy",
  povertyRate: "Poverty Rate",
  uninsuredRate: "Uninsured Rate",
  diabetes: "Diabetes Prevalence",
  hypertension: "Hypertension Prevalence",
  obesity: "Obesity Prevalence",
};

export const INDICATOR_UNITS: Record<IndicatorKey, string> = {
  lifeExpectancy: "years",
  povertyRate: "%",
  uninsuredRate: "%",
  diabetes: "%",
  hypertension: "%",
  obesity: "%",
};

export const INDICATOR_HIGHER_IS_BETTER: Record<IndicatorKey, boolean> = {
  lifeExpectancy: true,
  povertyRate: false,
  uninsuredRate: false,
  diabetes: false,
  hypertension: false,
  obesity: false,
};
