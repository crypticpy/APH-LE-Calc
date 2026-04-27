/**
 * U.S. life expectancy at birth, both sexes combined, by birth year.
 *
 * Source: National Center for Health Statistics, National Vital Statistics
 * System (NCHS/NVSS) historical life tables. Values shown at 5-year
 * intervals; intermediate years are linearly interpolated.
 *
 * https://www.cdc.gov/nchs/nvss/life-expectancy.htm
 */

const HISTORICAL_LE: Array<[year: number, le: number]> = [
  [1900, 47.3],
  [1905, 48.7],
  [1910, 50.0],
  [1915, 54.5],
  [1920, 54.1],
  [1925, 59.0],
  [1930, 59.7],
  [1935, 61.7],
  [1940, 62.9],
  [1945, 65.9],
  [1950, 68.2],
  [1955, 69.6],
  [1960, 69.7],
  [1965, 70.2],
  [1970, 70.8],
  [1975, 72.6],
  [1980, 73.7],
  [1985, 74.7],
  [1990, 75.4],
  [1995, 75.8],
  [2000, 76.8],
  [2005, 77.4],
  [2010, 78.7],
  [2015, 78.8],
  [2020, 77.0],
  [2022, 77.5],
];

export const HISTORICAL_LE_MIN_YEAR = HISTORICAL_LE[0][0];
export const HISTORICAL_LE_MAX_YEAR =
  HISTORICAL_LE[HISTORICAL_LE.length - 1][0];

/**
 * Returns the U.S. life expectancy at birth for someone born in `year`.
 * Linearly interpolates between the nearest published 5-year points.
 * Returns null if year is outside the published range.
 */
export function lifeExpectancyForBirthYear(year: number): number | null {
  if (year < HISTORICAL_LE_MIN_YEAR || year > HISTORICAL_LE_MAX_YEAR) {
    return null;
  }

  for (let i = 0; i < HISTORICAL_LE.length - 1; i++) {
    const [y0, le0] = HISTORICAL_LE[i];
    const [y1, le1] = HISTORICAL_LE[i + 1];
    if (year >= y0 && year <= y1) {
      if (y1 === y0) return le0;
      const t = (year - y0) / (y1 - y0);
      return le0 + t * (le1 - le0);
    }
  }

  return null;
}
