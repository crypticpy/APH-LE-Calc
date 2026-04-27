/**
 * Smoking impact on life expectancy.
 *
 * Effect sizes are population-level estimates from peer-reviewed literature:
 * - Doll R, Peto R, et al. "Mortality in relation to smoking: 50 years'
 *   observations on male British doctors." BMJ 2004;328:1519. Lifelong
 *   smokers lose ~10 years of life vs. never-smokers; quitting before age 40
 *   recovers most of that loss.
 * - U.S. Surgeon General. "The Health Consequences of Smoking - 50 Years of
 *   Progress." 2014. Secondhand smoke causes ~41,000 adult deaths/year in
 *   the US; non-smokers exposed to secondhand smoke have measurably higher
 *   all-cause mortality.
 *
 * These are statistical averages, not individual predictions.
 */

export type SmokingStatus = "never" | "former" | "current";

export interface SmokingInputs {
  status: SmokingStatus;
  ageAtQuit: number; // only used when status === "former"
  secondhand: boolean;
  kidsInHome: boolean;
}

export interface SmokingResult {
  /** Estimated years of life expectancy lost vs. an unexposed never-smoker. */
  deltaYears: number;
  /** One-sentence interpretation of the result. */
  message: string;
  /** Additional warning shown when children share the household. */
  childrenNote: string | null;
}

const CURRENT_SMOKER_LOSS = 10;
const SECONDHAND_LOSS = 1;

/** LE loss vs. never-smoker, indexed by age at which the person quit. */
function lossForFormerSmoker(ageAtQuit: number): number {
  if (ageAtQuit <= 30) return 0;
  if (ageAtQuit <= 40) return 1;
  if (ageAtQuit <= 50) return 4;
  if (ageAtQuit <= 60) return 7;
  return 9;
}

export function computeSmokingImpact(input: SmokingInputs): SmokingResult {
  let delta = 0;
  let message = "";

  switch (input.status) {
    case "never":
      delta = input.secondhand ? SECONDHAND_LOSS : 0;
      message = input.secondhand
        ? `Living with a smoker is estimated to shorten life expectancy by about ${SECONDHAND_LOSS} year on average.`
        : "Never smoking is one of the strongest protective factors for life expectancy.";
      break;

    case "current":
      delta = CURRENT_SMOKER_LOSS + (input.secondhand ? SECONDHAND_LOSS : 0);
      message = `Lifelong smokers lose roughly ${CURRENT_SMOKER_LOSS} years of life expectancy on average. Quitting at any age recovers some of that — quitting before 40 recovers most of it.`;
      break;

    case "former": {
      const baseLoss = lossForFormerSmoker(input.ageAtQuit);
      delta = baseLoss + (input.secondhand ? SECONDHAND_LOSS : 0);
      if (input.ageAtQuit <= 30) {
        message = `Quitting before age 30 recovers nearly all of the life expectancy that smoking would have cost.`;
      } else if (input.ageAtQuit <= 40) {
        message = `Quitting before age 40 recovers most life expectancy lost to smoking — about a 1-year residual loss compared to never smoking.`;
      } else if (input.ageAtQuit <= 50) {
        message = `Quitting in your 40s recovers about 6 of the 10 years that lifelong smoking would have cost.`;
      } else if (input.ageAtQuit <= 60) {
        message = `Quitting in your 50s still adds about 3 years back compared to continuing to smoke.`;
      } else {
        message = `Quitting after 60 still measurably extends life expectancy compared to continuing to smoke.`;
      }
      break;
    }
  }

  const childrenNote = input.kidsInHome
    ? "Children exposed to household smoke have higher rates of asthma, ear infections, lower respiratory illness, and SIDS. Effects can persist into adulthood as elevated cardiovascular and cancer risk."
    : null;

  return { deltaYears: delta, message, childrenNote };
}
