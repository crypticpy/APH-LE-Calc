import { APH_COLORS } from "./constants";
import type { IndicatorKey } from "../types/health";
import { INDICATOR_HIGHER_IS_BETTER } from "../types/health";

const GOOD_TO_BAD = [
  APH_COLORS.darkGreen,
  APH_COLORS.green,
  APH_COLORS.yellow,
  APH_COLORS.orange,
  APH_COLORS.red,
];
const BAD_TO_GOOD = [
  APH_COLORS.red,
  APH_COLORS.orange,
  APH_COLORS.yellow,
  APH_COLORS.green,
  APH_COLORS.darkGreen,
];

function interpolateColor(
  color1: string,
  color2: string,
  factor: number,
): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function getColorForValue(
  value: number,
  min: number,
  max: number,
  indicator: IndicatorKey,
): string {
  if (max === min) return APH_COLORS.lightGray;
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const scale = INDICATOR_HIGHER_IS_BETTER[indicator]
    ? BAD_TO_GOOD
    : GOOD_TO_BAD;
  const segment = normalized * (scale.length - 1);
  const index = Math.min(Math.floor(segment), scale.length - 2);
  const factor = segment - index;
  return interpolateColor(scale[index], scale[index + 1], factor);
}

export function getComparisonColor(
  value: number,
  countyAvg: number,
  higherIsBetter: boolean,
): string {
  const ratio = value / countyAvg;
  if (higherIsBetter) {
    if (ratio >= 1.05) return APH_COLORS.green;
    if (ratio <= 0.95) return APH_COLORS.red;
    return APH_COLORS.orange;
  } else {
    if (ratio <= 0.95) return APH_COLORS.green;
    if (ratio >= 1.05) return APH_COLORS.red;
    return APH_COLORS.orange;
  }
}
