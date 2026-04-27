export function formatValue(value: number | null, unit: string): string {
  if (value === null) return "N/A";
  if (unit === "years") return value.toFixed(1);
  if (unit === "%") return value.toFixed(1) + "%";
  if (unit === "per1k") return value.toFixed(1) + " /1k";
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
  let formatted: string;
  if (unit === "years") formatted = diff.toFixed(1);
  else if (unit === "per1k") formatted = diff.toFixed(1) + " /1k";
  else formatted = diff.toFixed(1) + "%";
  const qualifier = higherIsBetter
    ? diff > 0
      ? "above"
      : "below"
    : diff < 0
      ? "better than"
      : "worse than";
  return `${sign}${formatted} ${qualifier} county avg`;
}
