export function formatValue(value: number | null, unit: string): string {
  if (value === null) return "N/A";
  if (unit === "years") return value.toFixed(1);
  if (unit === "%") return value.toFixed(1) + "%";
  return value.toString();
}

export function formatDifference(
  value: number,
  countyAvg: number,
  unit: string,
  higherIsBetter: boolean,
): string {
  const diff = value - countyAvg;
  const sign = diff > 0 ? "+" : "";
  const formatted = unit === "years" ? diff.toFixed(1) : diff.toFixed(1) + "%";
  const qualifier = higherIsBetter
    ? diff > 0
      ? "above"
      : "below"
    : diff < 0
      ? "better than"
      : "worse than";
  return `${sign}${formatted} ${qualifier} county avg`;
}
