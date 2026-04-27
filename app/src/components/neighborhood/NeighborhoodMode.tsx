import { useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { Feature, Geometry, Position } from "geojson";
import { useHealthData } from "../../hooks/useHealthData";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { TRAVIS_COUNTY_ZCTAS, APH_COLORS } from "../../lib/constants";
import { getAgeGroup, getAgeGroupLabel } from "../../lib/ageGroupMapper";
import { getComparisonColor } from "../../lib/colorScales";
import { formatDifference } from "../../lib/formatters";
import {
  INDICATOR_LABELS,
  INDICATOR_UNITS,
  INDICATOR_HIGHER_IS_BETTER,
} from "../../types/health";
import type {
  AgeGroupKey,
  IndicatorKey,
  ZctaHealthData,
  CountyAverage,
} from "../../types/health";
import GaugeChart from "../shared/GaugeChart";
import SmokingCalculator from "./SmokingCalculator";
import ParentsCompare from "./ParentsCompare";
import DisparityStrip from "./DisparityStrip";

const GAUGE_INDICATORS: IndicatorKey[] = [
  "povertyRate",
  "uninsuredRate",
  "diabetes",
  "hypertension",
  "obesity",
];

const FEATURED_ZIPS: { label: string; zip: string }[] = [
  { label: "Downtown", zip: "78701" },
  { label: "East Austin", zip: "78702" },
  { label: "South Austin", zip: "78704" },
  { label: "West Lake", zip: "78746" },
  { label: "Pflugerville", zip: "78660" },
  { label: "North Austin", zip: "78758" },
];

/** Build a plain-English narrative from the ZCTA data and county average. */
function generateNarrative(
  zcta: string,
  data: ZctaHealthData,
  countyAvg: CountyAverage,
): string | null {
  const parts: string[] = [];

  // Life expectancy sentence
  if (data.lifeExpectancy != null) {
    const diff = data.lifeExpectancy - countyAvg.lifeExpectancy;
    const absDiff = Math.abs(diff);
    if (absDiff < 0.3) {
      parts.push(
        `Residents of ${zcta} can expect to live to ${data.lifeExpectancy.toFixed(1)} \u2014 right around the Travis County average.`,
      );
    } else if (diff > 0) {
      parts.push(
        `Residents of ${zcta} can expect to live to ${data.lifeExpectancy.toFixed(1)} \u2014 about ${absDiff.toFixed(1)} years longer than the Travis County average.`,
      );
    } else {
      parts.push(
        `Residents of ${zcta} can expect to live to ${data.lifeExpectancy.toFixed(1)} \u2014 about ${absDiff.toFixed(1)} years shorter than the Travis County average.`,
      );
    }
  }

  // Gather notable social determinants
  const highlights: string[] = [];

  if (data.povertyRate != null) {
    const pDiff = data.povertyRate - countyAvg.povertyRate;
    if (Math.abs(pDiff) >= 1.0) {
      highlights.push(
        `${pDiff < 0 ? "lower" : "higher"} poverty (${data.povertyRate.toFixed(1)}%)`,
      );
    }
  }

  if (data.uninsuredRate != null) {
    const uDiff = data.uninsuredRate - countyAvg.uninsuredRate;
    if (Math.abs(uDiff) >= 1.0) {
      highlights.push(
        `${uDiff < 0 ? "lower" : "higher"} uninsured rates (${data.uninsuredRate.toFixed(1)}%)`,
      );
    }
  }

  if (highlights.length > 0) {
    parts.push(
      `This area has ${highlights.join(" and ")} compared to the county.`,
    );
  }

  // Chronic disease note
  const diseaseNotes: string[] = [];
  if (data.diabetes != null) {
    const dDiff = data.diabetes - countyAvg.diabetes;
    if (Math.abs(dDiff) >= 1.5) {
      diseaseNotes.push(`diabetes (${data.diabetes.toFixed(1)}%)`);
    }
  }
  if (data.obesity != null) {
    const oDiff = data.obesity - countyAvg.obesity;
    if (Math.abs(oDiff) >= 2.0) {
      diseaseNotes.push(`obesity (${data.obesity.toFixed(1)}%)`);
    }
  }

  if (diseaseNotes.length > 0) {
    // Determine direction from the first item
    const firstVal = diseaseNotes[0].includes("diabetes")
      ? data.diabetes!
      : data.obesity!;
    const firstAvg = diseaseNotes[0].includes("diabetes")
      ? countyAvg.diabetes
      : countyAvg.obesity;
    const direction = firstVal > firstAvg ? "above" : "below";
    parts.push(
      `Rates of ${diseaseNotes.join(" and ")} are ${direction} average.`,
    );
  }

  if (parts.length === 0) return null;
  return parts.join(" ");
}

/** Ray-casting point-in-polygon test. */
function pointInPolygon(lat: number, lng: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][1],
      yi = ring[i][0]; // GeoJSON is [lng, lat]
    const xj = ring[j][1],
      yj = ring[j][0];
    if (
      xi > lat !== xj > lat &&
      lng < ((yj - yi) * (lat - xi)) / (xj - xi) + yi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/** Find which ZCTA boundary polygon contains a lat/lng point. */
function findZctaForPoint(
  lat: number,
  lng: number,
  features: Feature<Geometry>[],
): string | null {
  for (const feature of features) {
    const p = feature.properties;
    const zcta =
      p?.ZCTA5CE20 ??
      p?.ZCTA5CE10 ??
      p?.GEOID20 ??
      p?.GEOID10 ??
      p?.ZCTA ??
      p?.zcta ??
      null;
    if (!zcta) continue;

    const geom = feature.geometry;
    if (geom.type === "Polygon") {
      if (pointInPolygon(lat, lng, geom.coordinates[0])) return zcta;
    } else if (geom.type === "MultiPolygon") {
      for (const poly of geom.coordinates) {
        if (pointInPolygon(lat, lng, poly[0])) return zcta;
      }
    }
  }
  return null;
}

interface NeighborhoodModeProps {
  onAboutClick?: () => void;
}

export default function NeighborhoodMode({
  onAboutClick,
}: NeighborhoodModeProps = {}) {
  const { healthData, summary, boundaries } = useHealthData();
  const navigate = useNavigate();

  const [zipInput, setZipInput] = useState("");
  const [ageInput, setAgeInput] = useState("");
  const [submittedZip, setSubmittedZip] = useState<string | null>(null);
  const [submittedAge, setSubmittedAge] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [geoStatus, setGeoStatus] = useState<"idle" | "locating" | "error">(
    "idle",
  );
  const [geoError, setGeoError] = useState<string | null>(null);
  const geoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const zipIsValid = /^\d{5}$/.test(zipInput);
  const ageIsValid =
    ageInput === "" ||
    (Number.isInteger(Number(ageInput)) &&
      Number(ageInput) >= 0 &&
      Number(ageInput) <= 100);

  // Find nearby ZCTAs when zip not found
  const nearbySuggestions = useMemo(() => {
    if (!notFound || !zipInput) return [];
    const prefix = zipInput.slice(0, 3);
    return TRAVIS_COUNTY_ZCTAS.filter((z) => z.startsWith(prefix)).slice(0, 5);
  }, [notFound, zipInput]);

  const handleExplore = useCallback(
    function handleExplore(overrideZip?: string) {
      const zip = overrideZip ?? zipInput;
      const zipValid = /^\d{5}$/.test(zip);
      if (!zipValid || !ageIsValid || !healthData) return;

      const zctaData = healthData.zctas[zip];
      if (!zctaData) {
        setNotFound(true);
        setShowResults(false);
        setSubmittedZip(null);
        setSubmittedAge(null);
        return;
      }

      setNotFound(false);
      setSubmittedZip(zip);
      setSubmittedAge(ageInput !== "" ? Number(ageInput) : null);

      // Trigger slide-in by toggling off then on
      setShowResults(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShowResults(true);
        });
      });
    },
    [zipInput, ageInput, ageIsValid, healthData],
  );

  function handleSuggestionClick(zip: string) {
    setZipInput(zip);
    setNotFound(false);
  }

  function handleFeaturedClick(zip: string) {
    setZipInput(zip);
    setNotFound(false);
    // Use a timeout so the state updates propagate before explore
    setTimeout(() => {
      handleExplore(zip);
    }, 0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleExplore();
    }
  }

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      setGeoError("Geolocation not supported");
      return;
    }

    setGeoStatus("locating");
    setGeoError(null);
    if (geoTimeoutRef.current) clearTimeout(geoTimeoutRef.current);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const features = boundaries?.features as
          | Feature<Geometry>[]
          | undefined;

        if (!features || features.length === 0) {
          setGeoStatus("error");
          setGeoError("Boundary data not loaded");
          geoTimeoutRef.current = setTimeout(() => setGeoStatus("idle"), 3000);
          return;
        }

        const foundZip = findZctaForPoint(latitude, longitude, features);
        if (foundZip) {
          setZipInput(foundZip);
          setNotFound(false);
          setGeoStatus("idle");
          setTimeout(() => handleExplore(foundZip), 0);
        } else {
          setGeoStatus("error");
          setGeoError("Not in Travis County");
          geoTimeoutRef.current = setTimeout(() => setGeoStatus("idle"), 3000);
        }
      },
      (err) => {
        setGeoStatus("error");
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError("Location permission denied");
            break;
          case err.TIMEOUT:
            setGeoError("Location request timed out");
            break;
          default:
            setGeoError("Could not get location");
        }
        geoTimeoutRef.current = setTimeout(() => setGeoStatus("idle"), 3000);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }, [boundaries, handleExplore]);

  const zctaData =
    submittedZip && healthData ? healthData.zctas[submittedZip] : null;
  const countyAvg = healthData?.meta.countyAverage ?? null;

  // Age-specific data
  const ageGroup: AgeGroupKey | null =
    submittedAge !== null ? getAgeGroup(submittedAge) : null;
  const ageGroupLabel =
    submittedAge !== null ? getAgeGroupLabel(submittedAge) : null;
  const ageSpecific =
    ageGroup && zctaData?.ageSpecific ? zctaData.ageSpecific[ageGroup] : null;

  // Life expectancy color
  const leColor =
    zctaData?.lifeExpectancy != null && countyAvg
      ? getComparisonColor(
          zctaData.lifeExpectancy,
          countyAvg.lifeExpectancy,
          true,
        )
      : APH_COLORS.darkGray;

  // Check if ALL indicator data is null (truly empty record)
  const hasAnyGaugeData =
    zctaData != null && GAUGE_INDICATORS.some((key) => zctaData[key] != null);
  const hasLifeExpectancy = zctaData?.lifeExpectancy != null;
  const allDataMissing = !hasLifeExpectancy && !hasAnyGaugeData;

  // Narrative
  const narrative =
    zctaData && countyAvg && submittedZip
      ? generateNarrative(submittedZip, zctaData, countyAvg)
      : null;

  // County range — longest- and shortest-LE ZIPs in Travis County
  const countyRange = useMemo(() => {
    if (!healthData) return null;
    let longest: { zip: string; le: number } | null = null;
    let shortest: { zip: string; le: number } | null = null;
    for (const [zip, data] of Object.entries(healthData.zctas)) {
      if (data.lifeExpectancy == null) continue;
      if (!longest || data.lifeExpectancy > longest.le) {
        longest = { zip, le: data.lifeExpectancy };
      }
      if (!shortest || data.lifeExpectancy < shortest.le) {
        shortest = { zip, le: data.lifeExpectancy };
      }
    }
    return longest && shortest ? { longest, shortest } : null;
  }, [healthData]);

  // Animated life expectancy — only animate when results are visible
  const animatedLE = useAnimatedNumber(
    showResults && zctaData?.lifeExpectancy != null
      ? zctaData.lifeExpectancy
      : null,
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-bold text-aph-dark-blue mb-3">
          Check Your Neighborhood
        </h2>
        <p className="text-aph-dark-gray text-lg max-w-2xl mx-auto">
          Enter a zip code to explore health data for your community in Travis
          County. See how life expectancy and health indicators compare to the
          county average.
        </p>
        <button
          onClick={onAboutClick}
          className="group mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-aph-dark-blue to-aph-blue text-white text-sm font-semibold shadow-md hover:shadow-lg hover:brightness-110 active:scale-[0.98] transition cursor-pointer"
        >
          <span
            className="material-symbols-outlined text-aph-green"
            style={{ fontSize: "18px" }}
          >
            auto_awesome
          </span>
          <span>Built in ~12 hours by APH IT</span>
          <span className="text-white/60 mx-0.5">·</span>
          <span className="text-aph-green group-hover:underline">See how</span>
          <span
            className="material-symbols-outlined transition-transform group-hover:translate-x-0.5"
            style={{ fontSize: "16px" }}
          >
            arrow_forward
          </span>
        </button>
      </section>

      {/* Input Section */}
      <section className="flex flex-col items-stretch sm:flex-row sm:items-center sm:justify-center gap-3 mb-4">
        <button
          onClick={handleGeolocate}
          disabled={geoStatus === "locating"}
          className="p-3 rounded-lg border border-aph-light-gray bg-white text-aph-blue hover:text-aph-green disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5"
          aria-label="Use my location"
          title="Use my location"
        >
          <span
            className={`material-symbols-outlined text-xl ${geoStatus === "locating" ? "animate-spin" : ""}`}
          >
            my_location
          </span>
          {geoStatus === "locating" && (
            <span className="text-sm font-medium text-aph-dark-gray whitespace-nowrap">
              Locating...
            </span>
          )}
          {geoStatus === "error" && geoError && (
            <span className="text-sm font-medium text-aph-red whitespace-nowrap">
              {geoError}
            </span>
          )}
        </button>

        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-aph-dark-gray text-xl">
            location_on
          </span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={5}
            placeholder="Zip code"
            value={zipInput}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 5);
              setZipInput(val);
              setNotFound(false);
            }}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-4 py-3 w-full sm:w-44 rounded-lg border border-aph-light-gray bg-white text-aph-dark-blue font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-aph-blue transition"
            aria-label="Zip code"
          />
        </div>

        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-aph-dark-gray text-xl">
            person
          </span>
          <input
            type="number"
            min={0}
            max={100}
            placeholder="Age (optional)"
            value={ageInput}
            onChange={(e) => setAgeInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pl-10 pr-4 py-3 w-full sm:w-48 rounded-lg border border-aph-light-gray bg-white text-aph-dark-blue font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-aph-blue transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            aria-label="Age (optional)"
          />
        </div>

        <button
          onClick={() => handleExplore()}
          disabled={!zipIsValid || !ageIsValid}
          className="px-8 py-3 bg-aph-green text-white font-semibold text-lg rounded-lg hover:brightness-110 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-xl">search</span>
          Explore
        </button>
      </section>

      {/* Featured zip quick-select pills */}
      <section className="flex flex-col items-center mb-10">
        <p className="text-xs text-aph-dark-gray mb-2">Try a neighborhood:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {FEATURED_ZIPS.map(({ label, zip }) => (
            <button
              key={zip}
              onClick={() => handleFeaturedClick(zip)}
              className="px-3 py-1.5 rounded-full text-sm border border-aph-blue/30 text-aph-blue hover:bg-aph-blue hover:text-white transition cursor-pointer"
            >
              {label} {zip}
            </button>
          ))}
        </div>
      </section>

      {/* Not found message */}
      {notFound && (
        <div className="text-center mb-8 p-6 bg-white rounded-xl shadow-sm border border-aph-light-gray/40 max-w-lg mx-auto">
          <span className="material-symbols-outlined text-aph-orange text-4xl mb-2 block">
            wrong_location
          </span>
          <p className="text-aph-dark-blue font-semibold text-lg mb-1">
            Zip code {zipInput} not found
          </p>
          <p className="text-aph-dark-gray text-sm mb-3">
            We only have data for Travis County zip codes. Try one of these
            nearby areas:
          </p>
          {nearbySuggestions.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2">
              {nearbySuggestions.map((z) => (
                <button
                  key={z}
                  onClick={() => handleSuggestionClick(z)}
                  className="px-4 py-1.5 rounded-full border border-aph-blue text-aph-blue text-sm font-semibold hover:bg-aph-blue hover:text-white transition"
                >
                  {z}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-2">
              {TRAVIS_COUNTY_ZCTAS.slice(0, 5).map((z) => (
                <button
                  key={z}
                  onClick={() => handleSuggestionClick(z)}
                  className="px-4 py-1.5 rounded-full border border-aph-blue text-aph-blue text-sm font-semibold hover:bg-aph-blue hover:text-white transition"
                >
                  {z}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results Section */}
      {zctaData && countyAvg && (
        <div
          className={`transition-all duration-500 ease-out ${
            showResults
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-8"
          }`}
        >
          {/* ALL data missing — single empty state */}
          {allDataMissing ? (
            <section className="bg-white rounded-2xl shadow-md border border-aph-light-gray/30 p-6 md:p-8 mb-6 text-center">
              <span className="material-symbols-outlined text-aph-dark-gray text-5xl mb-3 block">
                info
              </span>
              <p className="text-lg text-aph-dark-blue font-semibold mb-1">
                No data available
              </p>
              <p className="text-sm text-aph-dark-gray max-w-md mx-auto">
                Health data is not available for zip code {submittedZip}. This
                area may have too few residents for reliable estimates or may
                cross county boundaries.
              </p>
            </section>
          ) : (
            <>
              {/* Life expectancy hero card */}
              <section className="bg-white rounded-2xl shadow-md border border-aph-light-gray/30 p-6 md:p-8 mb-6">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* Big number */}
                  <div className="text-center md:text-left flex-shrink-0">
                    <p className="text-sm font-semibold text-aph-dark-gray uppercase tracking-wide mb-1">
                      Life Expectancy at Birth
                    </p>
                    {hasLifeExpectancy ? (
                      <>
                        <p
                          className="text-6xl md:text-7xl font-bold leading-none"
                          style={{ color: leColor }}
                        >
                          {(animatedLE ?? zctaData.lifeExpectancy!).toFixed(1)}
                        </p>
                        <p className="text-lg text-aph-dark-gray mt-1">years</p>
                      </>
                    ) : (
                      /* Partial data: life expectancy missing but other data exists */
                      <div className="flex items-start gap-2.5 mt-2 p-3 rounded-lg bg-aph-light-blue/40 border border-aph-blue/15 max-w-sm">
                        <span
                          className="material-symbols-outlined text-aph-blue mt-0.5 flex-shrink-0"
                          style={{ fontSize: "20px" }}
                        >
                          info
                        </span>
                        <p className="text-sm text-aph-dark-blue leading-snug">
                          Life expectancy data is not available for this zip
                          code. This area may cross county boundaries.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Comparison details */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-aph-blue">
                        pin_drop
                      </span>
                      <span className="text-aph-dark-blue font-semibold text-lg">
                        Zip Code {submittedZip}
                      </span>
                    </div>

                    {hasLifeExpectancy && (
                      <>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: leColor }}
                            />
                            <span className="text-sm text-aph-dark-gray">
                              {formatDifference(
                                zctaData.lifeExpectancy!,
                                countyAvg.lifeExpectancy,
                                "years",
                                true,
                              )}
                            </span>
                          </div>
                          <span className="text-sm text-aph-dark-gray">
                            County average:{" "}
                            <span className="font-semibold text-aph-dark-blue">
                              {countyAvg.lifeExpectancy.toFixed(1)} years
                            </span>
                          </span>
                        </div>

                        {zctaData.lifeExpectancySE != null && (
                          <p className="text-xs text-aph-dark-gray">
                            Standard error: {"\u00B1"}
                            {zctaData.lifeExpectancySE.toFixed(1)} years
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Age-specific result */}
                {submittedAge !== null && ageSpecific && (
                  <div className="mt-6 pt-6 border-t border-aph-light-gray/50">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-aph-green text-2xl mt-0.5">
                        cake
                      </span>
                      <div>
                        <p className="text-sm text-aph-dark-gray mb-1">
                          Age group: {ageGroupLabel} ({ageGroup})
                        </p>
                        <p className="text-aph-dark-blue text-lg">
                          At age{" "}
                          <span className="font-bold">{submittedAge}</span>,
                          estimated remaining years:{" "}
                          <span
                            className="font-bold text-2xl"
                            style={{ color: APH_COLORS.blue }}
                          >
                            {ageSpecific.ex.toFixed(1)}
                          </span>
                        </p>
                        <p className="text-aph-dark-gray mt-1">
                          Expected to reach approximately age{" "}
                          <span className="font-semibold text-aph-dark-blue">
                            {(submittedAge + ageSpecific.ex).toFixed(0)}
                          </span>
                        </p>
                        {ageSpecific.se > 0 && (
                          <p className="text-xs text-aph-dark-gray mt-1">
                            Standard error: {"\u00B1"}
                            {ageSpecific.se.toFixed(1)} years
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Age entered but no age-specific data available */}
                {submittedAge !== null &&
                  !ageSpecific &&
                  zctaData.ageSpecific === null && (
                    <div className="mt-6 pt-6 border-t border-aph-light-gray/50">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-aph-dark-gray text-2xl">
                          info
                        </span>
                        <p className="text-aph-dark-gray">
                          Age-specific life expectancy data is not available for
                          this zip code.
                        </p>
                      </div>
                    </div>
                  )}
              </section>

              {/* Disparity hero — the gap number, big */}
              {hasLifeExpectancy &&
                countyRange &&
                submittedZip &&
                zctaData.lifeExpectancy != null && (
                  <section
                    className="mb-6 rounded-2xl shadow-md p-6 md:p-8 text-white relative overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${APH_COLORS.darkBlue} 0%, #2c3168 60%, ${APH_COLORS.blue} 100%)`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-aph-green text-lg">
                        social_distance
                      </span>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-white/80">
                        The Travis County gap
                      </h4>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-end gap-6">
                      <div className="md:flex-shrink-0">
                        <p
                          className="text-6xl md:text-7xl font-bold leading-none tracking-tight tabular-nums"
                          style={{ color: APH_COLORS.green }}
                        >
                          {(
                            countyRange.longest.le - countyRange.shortest.le
                          ).toFixed(1)}
                        </p>
                        <p className="text-white/80 text-sm mt-1">
                          years between Travis County&rsquo;s longest- and
                          shortest-living ZIPs
                        </p>
                      </div>
                      <div className="flex-1 grid grid-cols-3 gap-3 md:gap-4">
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70 mb-1">
                            Longest
                          </p>
                          <p className="font-bold text-white text-base">
                            {countyRange.longest.zip}
                          </p>
                          <p
                            className="text-sm font-semibold"
                            style={{ color: APH_COLORS.green }}
                          >
                            {countyRange.longest.le.toFixed(1)} yrs
                          </p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70 mb-1">
                            Shortest
                          </p>
                          <p className="font-bold text-white text-base">
                            {countyRange.shortest.zip}
                          </p>
                          <p
                            className="text-sm font-semibold"
                            style={{ color: APH_COLORS.red }}
                          >
                            {countyRange.shortest.le.toFixed(1)} yrs
                          </p>
                        </div>
                        <div
                          className="rounded-lg p-3 border"
                          style={{
                            backgroundColor: "rgba(0, 159, 77, 0.15)",
                            borderColor: "rgba(0, 159, 77, 0.5)",
                          }}
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70 mb-1">
                            Your ZIP
                          </p>
                          <p className="font-bold text-white text-base">
                            {submittedZip}
                          </p>
                          <p className="text-sm font-semibold text-white">
                            {submittedZip === countyRange.longest.zip
                              ? "Top of county"
                              : submittedZip === countyRange.shortest.zip
                                ? "Bottom of county"
                                : `${(countyRange.longest.le - zctaData.lifeExpectancy).toFixed(1)} yrs behind top`}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-white/70 mt-4 leading-relaxed max-w-3xl">
                      A gap shaped by income, access to care, environment, and
                      other social determinants of health.
                    </p>
                  </section>
                )}

              {/* Sorted-bar disparity strip */}
              {hasLifeExpectancy && submittedZip && (
                <DisparityStrip highlightZip={submittedZip} />
              )}

              {/* Narrative summary */}
              {narrative && (
                <section
                  className="mb-6 rounded-xl bg-white shadow-sm p-5 border border-aph-light-gray/30"
                  style={{ borderLeft: `4px solid ${APH_COLORS.blue}` }}
                >
                  <p className="text-sm italic text-aph-dark-blue/85 leading-relaxed">
                    {narrative}
                  </p>
                </section>
              )}

              {/* Health indicator gauges */}
              {hasAnyGaugeData && (
                <section>
                  <h3 className="text-xl font-bold text-aph-dark-blue mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-aph-blue">
                      monitoring
                    </span>
                    Health Indicators
                  </h3>
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    {GAUGE_INDICATORS.map((key) => {
                      const indicatorSummary = summary?.indicators[key];
                      return (
                        <GaugeChart
                          key={key}
                          value={zctaData[key]}
                          label={INDICATOR_LABELS[key]}
                          unit={INDICATOR_UNITS[key]}
                          countyAvg={countyAvg[key]}
                          min={indicatorSummary?.min ?? 0}
                          max={indicatorSummary?.max ?? 100}
                          higherIsBetter={INDICATOR_HIGHER_IS_BETTER[key]}
                        />
                      );
                    })}
                  </div>
                </section>
              )}

              {/* View on Map link */}
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => navigate(`/explore?zcta=${submittedZip}`)}
                  className="text-aph-blue text-sm font-semibold flex items-center gap-1 hover:underline"
                >
                  <span className="material-symbols-outlined text-base">
                    map
                  </span>
                  View on Map
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Personal Factors — always visible, independent of ZIP submission */}
      <section className="mt-12">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-aph-dark-blue mb-2">
            How do personal factors affect life expectancy?
          </h3>
          <p className="text-sm text-aph-dark-gray max-w-2xl mx-auto">
            Neighborhood is one factor — personal choices and exposures matter
            too. Try these calculators to see how.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SmokingCalculator />
          <ParentsCompare />
        </div>
      </section>
    </div>
  );
}
