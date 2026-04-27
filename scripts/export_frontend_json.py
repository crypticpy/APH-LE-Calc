"""
Export Frontend JSON Data for Austin Health Pulse
==================================================
Reads local USALEEP data (TX_A.CSV, TX_B.CSV), downloads HUD crosswalk and
ACS/CDC PLACES data, aggregates everything to ZCTA level, and exports
frontend-ready JSON files.

Requirements:
    pip install requests pandas openpyxl numpy

Output files:
    app/public/data/zcta_health_data.json   -- per-ZCTA health indicators
    app/public/data/county_summary.json     -- summary statistics

Usage:
    python scripts/export_frontend_json.py
"""

import os
import sys
import io
import json
import datetime
import requests
import numpy as np
import pandas as pd

# ── CONFIG ────────────────────────────────────────────────────────────────────

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, "app", "public", "data")

TX_A_PATH = os.path.join(PROJECT_ROOT, "TX_A.CSV")
TX_B_PATH = os.path.join(PROJECT_ROOT, "TX_B.CSV")

CENSUS_API_KEY = os.environ.get("CENSUS_API_KEY", "")

STATE_FIPS = "48"  # Texas
TRAVIS_COUNTY_FIPS = "48453"

# Sentinel values for missing/suppressed data
SENTINEL_MISSING = 88888
SENTINEL_SUPPRESSED = 99999

# Age groups in TX_B.CSV (11 groups, ordered)
AGE_GROUPS = [
    "Under 1",
    "1-4",
    "5-14",
    "15-24",
    "25-34",
    "35-44",
    "45-54",
    "55-64",
    "65-74",
    "75-84",
    "85 and older",
]

# Travis County ZCTAs
TRAVIS_COUNTY_ZCTAS = [
    "78610",
    "78613",
    "78617",
    "78620",
    "78621",
    "78634",
    "78640",
    "78641",
    "78642",
    "78644",
    "78645",
    "78646",
    "78652",
    "78653",
    "78660",
    "78664",
    "78669",
    "78676",
    "78681",
    "78701",
    "78702",
    "78703",
    "78704",
    "78705",
    "78712",
    "78717",
    "78719",
    "78721",
    "78722",
    "78723",
    "78724",
    "78725",
    "78726",
    "78727",
    "78728",
    "78729",
    "78730",
    "78731",
    "78732",
    "78733",
    "78734",
    "78735",
    "78736",
    "78737",
    "78738",
    "78739",
    "78741",
    "78742",
    "78744",
    "78745",
    "78746",
    "78747",
    "78748",
    "78749",
    "78750",
    "78751",
    "78752",
    "78753",
    "78754",
    "78756",
    "78757",
    "78758",
    "78759",
]

CENSUS_ZCTA_TRACT_2010_URL = (
    "https://www2.census.gov/geo/docs/maps-data/data/rel/zcta_tract_rel_10.txt"
)

# 2020 vintage ZCTA-to-Tract crosswalk — needed for current-year datasets like
# APD crime that geocode against 2020 tract boundaries (which differ from 2010
# in many places due to tract subdivisions).
CENSUS_ZCTA_TRACT_2020_URL = (
    "https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/"
    "tab20_zcta520_tract20_natl.txt"
)


# ── STEP 1: Load Census 2010 ZCTA-to-Tract Crosswalk ────────────────────────


def load_crosswalk():
    """
    Download the Census Bureau 2010 ZCTA-to-Tract relationship file and return
    a DataFrame with columns: GEOID_TRACT, ZCTA, res_ratio.

    IMPORTANT: USALEEP life expectancy data uses 2010 Census tract boundaries,
    so we must use the 2010 relationship file (not 2020) for correct matching.
    Uses POPPT/TRPOP (population in part / total tract population) as weight.
    """
    print("[1/5] Downloading Census 2010 ZCTA-to-Tract relationship file...")
    print(f"      URL: {CENSUS_ZCTA_TRACT_2010_URL}")

    try:
        r = requests.get(CENSUS_ZCTA_TRACT_2010_URL, timeout=180)
        r.raise_for_status()
    except requests.RequestException as e:
        print(f"      ERROR: Failed to download Census crosswalk: {e}")
        sys.exit(1)

    xwalk = pd.read_csv(io.StringIO(r.text), dtype=str)
    print(f"      Downloaded {len(xwalk)} national ZCTA-tract pairs.")

    # Rename columns — GEOID is the 11-digit tract FIPS
    xwalk = xwalk.rename(
        columns={
            "ZCTA5": "ZCTA",
            "GEOID": "GEOID_TRACT",
        }
    )

    xwalk["ZCTA"] = xwalk["ZCTA"].astype(str).str.zfill(5)
    xwalk["GEOID_TRACT"] = xwalk["GEOID_TRACT"].astype(str).str.zfill(11)

    # Population-based weight: fraction of tract pop in this ZCTA
    xwalk["POPPT"] = pd.to_numeric(xwalk["POPPT"], errors="coerce").fillna(0)
    xwalk["TRPOP"] = pd.to_numeric(xwalk["TRPOP"], errors="coerce").fillna(0)

    # Filter to Travis County ZCTAs
    xwalk = xwalk[xwalk["ZCTA"].isin(TRAVIS_COUNTY_ZCTAS)]

    # Compute res_ratio as fraction of tract population in this ZCTA
    xwalk["res_ratio"] = xwalk.apply(
        lambda row: (row["POPPT"] / row["TRPOP"] if row["TRPOP"] > 0 else 0),
        axis=1,
    )

    xwalk = xwalk[xwalk["res_ratio"] > 0]
    print(
        f"      Filtered crosswalk: {len(xwalk)} tract-ZCTA mappings for Travis County."
    )
    return xwalk[["GEOID_TRACT", "ZCTA", "res_ratio"]]


def load_crosswalk_2020():
    """
    Download the Census 2020 ZCTA-to-Tract relationship file. Used for
    aggregating datasets geocoded to 2020 tract boundaries (e.g. APD crime).

    The 2020 file is pipe-delimited and uses different column names than the
    2010 file: GEOID_TRACT_20, GEOID_ZCTA5_20, AREALAND_PART, AREALAND_TRACT_20.
    Land-area ratio is used as the weight (population fields aren't included).
    """
    print("[1b/7] Downloading Census 2020 ZCTA-to-Tract relationship file...")
    print(f"       URL: {CENSUS_ZCTA_TRACT_2020_URL}")

    try:
        r = requests.get(CENSUS_ZCTA_TRACT_2020_URL, timeout=180)
        r.raise_for_status()
    except requests.RequestException as e:
        print(f"       ERROR: Failed to download 2020 crosswalk: {e}")
        return None

    xwalk = pd.read_csv(io.StringIO(r.text), dtype=str, sep="|")
    print(f"       Downloaded {len(xwalk)} national 2020 ZCTA-tract pairs.")

    xwalk = xwalk.rename(
        columns={
            "GEOID_ZCTA5_20": "ZCTA",
            "GEOID_TRACT_20": "GEOID_TRACT",
        }
    )
    xwalk["ZCTA"] = xwalk["ZCTA"].astype(str).str.zfill(5)
    xwalk["GEOID_TRACT"] = xwalk["GEOID_TRACT"].astype(str).str.zfill(11)

    xwalk["AREALAND_PART"] = pd.to_numeric(
        xwalk.get("AREALAND_PART"), errors="coerce"
    ).fillna(0)
    xwalk["AREALAND_TRACT_20"] = pd.to_numeric(
        xwalk.get("AREALAND_TRACT_20"), errors="coerce"
    ).fillna(0)

    xwalk = xwalk[xwalk["ZCTA"].isin(TRAVIS_COUNTY_ZCTAS)]

    xwalk["res_ratio"] = xwalk.apply(
        lambda row: (
            row["AREALAND_PART"] / row["AREALAND_TRACT_20"]
            if row["AREALAND_TRACT_20"] > 0
            else 0
        ),
        axis=1,
    )
    xwalk = xwalk[xwalk["res_ratio"] > 0]
    print(
        f"       Filtered 2020 crosswalk: {len(xwalk)} tract-ZCTA mappings for Travis County."
    )
    return xwalk[["GEOID_TRACT", "ZCTA", "res_ratio"]]


# ── STEP 2: Life Expectancy from TX_A.CSV ────────────────────────────────────


def load_life_expectancy(xwalk):
    """
    Read TX_A.CSV (life expectancy at birth per tract), merge with HUD
    crosswalk, and compute population-weighted average per ZCTA.

    Returns DataFrame with columns: ZCTA, lifeExpectancy, lifeExpectancySE
    """
    print("[2/5] Loading life expectancy from TX_A.CSV...")

    if not os.path.exists(TX_A_PATH):
        print(f"      ERROR: TX_A.CSV not found at {TX_A_PATH}")
        sys.exit(1)

    df = pd.read_csv(TX_A_PATH, dtype={"Tract ID": str})
    df = df.rename(
        columns={"Tract ID": "GEOID_TRACT", "e(0)": "e0", "se(e(0))": "se_e0"}
    )
    df["GEOID_TRACT"] = df["GEOID_TRACT"].astype(str).str.zfill(11)
    df["e0"] = pd.to_numeric(df["e0"], errors="coerce")
    df["se_e0"] = pd.to_numeric(df["se_e0"], errors="coerce")

    print(f"      Loaded {len(df)} tracts from TX_A.CSV.")

    # Merge with crosswalk
    merged = xwalk.merge(
        df[["GEOID_TRACT", "e0", "se_e0"]], on="GEOID_TRACT", how="left"
    )

    # Drop rows where life expectancy or res_ratio is missing
    valid = merged.dropna(subset=["e0", "res_ratio"])
    valid = valid[valid["res_ratio"] > 0]

    # Weighted average per ZCTA
    valid["w_e0"] = valid["e0"] * valid["res_ratio"]
    valid["w_se"] = valid["se_e0"] * valid["res_ratio"]

    agg = (
        valid.groupby("ZCTA")
        .agg(
            sum_w_e0=("w_e0", "sum"),
            sum_w_se=("w_se", "sum"),
            sum_ratio=("res_ratio", "sum"),
        )
        .reset_index()
    )

    agg["lifeExpectancy"] = (agg["sum_w_e0"] / agg["sum_ratio"]).round(2)
    agg["lifeExpectancySE"] = (agg["sum_w_se"] / agg["sum_ratio"]).round(2)

    result = agg[["ZCTA", "lifeExpectancy", "lifeExpectancySE"]]
    print(f"      Aggregated life expectancy for {len(result)} ZCTAs.")
    return result


# ── STEP 3: Age-Specific Life Tables from TX_B.CSV ──────────────────────────


def load_age_specific(xwalk):
    """
    Read TX_B.CSV (full life tables per tract), merge with HUD crosswalk,
    and compute population-weighted average e(x) and se(e(x)) per ZCTA
    for each age group.

    Returns dict: { ZCTA: { age_group: { "ex": float, "se": float }, ... }, ... }
    """
    print("[3/5] Loading age-specific life tables from TX_B.CSV...")

    if not os.path.exists(TX_B_PATH):
        print(f"      ERROR: TX_B.CSV not found at {TX_B_PATH}")
        sys.exit(1)

    df = pd.read_csv(TX_B_PATH, dtype={"Tract ID": str})
    df = df.rename(
        columns={
            "Tract ID": "GEOID_TRACT",
            "Age Group": "age_group",
            "e(x)": "ex",
            "se(e(x))": "se_ex",
        }
    )
    df["GEOID_TRACT"] = df["GEOID_TRACT"].astype(str).str.zfill(11)
    df["ex"] = pd.to_numeric(df["ex"], errors="coerce")
    df["se_ex"] = pd.to_numeric(df["se_ex"], errors="coerce")

    print(f"      Loaded {len(df)} tract-age records from TX_B.CSV.")

    # Merge with crosswalk
    merged = xwalk.merge(
        df[["GEOID_TRACT", "age_group", "ex", "se_ex"]],
        on="GEOID_TRACT",
        how="left",
    )

    # Drop rows where data or ratio is missing
    valid = merged.dropna(subset=["ex", "res_ratio"])
    valid = valid[valid["res_ratio"] > 0]

    # Weighted averages per ZCTA + age group
    valid["w_ex"] = valid["ex"] * valid["res_ratio"]
    valid["w_se"] = valid["se_ex"] * valid["res_ratio"]

    agg = (
        valid.groupby(["ZCTA", "age_group"])
        .agg(
            sum_w_ex=("w_ex", "sum"),
            sum_w_se=("w_se", "sum"),
            sum_ratio=("res_ratio", "sum"),
        )
        .reset_index()
    )

    agg["ex"] = (agg["sum_w_ex"] / agg["sum_ratio"]).round(2)
    agg["se"] = (agg["sum_w_se"] / agg["sum_ratio"]).round(2)

    # Build nested dict
    result = {}
    for _, row in agg.iterrows():
        zcta = row["ZCTA"]
        age = row["age_group"]
        if zcta not in result:
            result[zcta] = {}
        result[zcta][age] = {"ex": row["ex"], "se": row["se"]}

    zcta_count = len(result)
    print(f"      Aggregated age-specific data for {zcta_count} ZCTAs.")
    return result


# ── STEP 4: ACS Data (Poverty + Uninsured) ───────────────────────────────────


def pull_acs():
    """
    Pull ACS 5-Year 2022 subject table data for Travis County ZCTAs.
    ZCTAs are queried directly without state nesting.

    Returns DataFrame with columns: ZCTA, povertyRate, uninsuredRate
    """
    print("[4/5] Pulling ACS 5-Year 2022 data (poverty + uninsured)...")

    base_url = "https://api.census.gov/data/2022/acs/acs5/subject"

    # Query ZCTAs in batches (API limits the number of areas per request).
    # Pulls poverty + uninsured from the subject tables and total population
    # (B01003) from the detail tables — population is needed downstream to
    # normalize crime counts into per-1,000-resident rates.
    base_detail_url = "https://api.census.gov/data/2022/acs/acs5"

    def batched_pull(url: str, get_vars: str):
        """Run a paged ZCTA query against an ACS endpoint, return rows + header."""
        rows: list[list[str]] = []
        header_out: list[str] = []
        for i in range(0, len(TRAVIS_COUNTY_ZCTAS), 25):
            batch = TRAVIS_COUNTY_ZCTAS[i : i + 25]
            zcta_list = ",".join(batch)
            params = {
                "get": get_vars,
                "for": f"zip code tabulation area:{zcta_list}",
            }
            if CENSUS_API_KEY:
                params["key"] = CENSUS_API_KEY
            try:
                r = requests.get(url, params=params, timeout=60)
                r.raise_for_status()
                data = r.json()
                rows.extend(data[1:])
                if not header_out:
                    header_out = data[0]
            except requests.RequestException as e:
                print(f"      WARNING: ACS batch failed ({url}): {e}")
                continue
        return rows, header_out

    subject_rows, subject_header = batched_pull(
        base_url, "NAME,S1701_C03_001E,S2701_C05_001E"
    )
    pop_rows, pop_header = batched_pull(base_detail_url, "NAME,B01003_001E")

    if not subject_rows:
        print("      ERROR: All ACS subject-table requests failed.")
        return pd.DataFrame(
            {
                "ZCTA": TRAVIS_COUNTY_ZCTAS,
                "povertyRate": np.nan,
                "uninsuredRate": np.nan,
                "population": np.nan,
            }
        )

    df = pd.DataFrame(subject_rows, columns=subject_header)
    df = df.rename(
        columns={
            "zip code tabulation area": "ZCTA",
            "S1701_C03_001E": "povertyRate",
            "S2701_C05_001E": "uninsuredRate",
        }
    )
    df["ZCTA"] = df["ZCTA"].astype(str).str.zfill(5)
    df = df[df["ZCTA"].isin(TRAVIS_COUNTY_ZCTAS)][
        ["ZCTA", "povertyRate", "uninsuredRate"]
    ]

    for col in ["povertyRate", "uninsuredRate"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
        df.loc[df[col] < 0, col] = np.nan

    if pop_rows:
        pop_df = pd.DataFrame(pop_rows, columns=pop_header)
        pop_df = pop_df.rename(
            columns={
                "zip code tabulation area": "ZCTA",
                "B01003_001E": "population",
            }
        )
        pop_df["ZCTA"] = pop_df["ZCTA"].astype(str).str.zfill(5)
        pop_df["population"] = pd.to_numeric(pop_df["population"], errors="coerce")
        pop_df.loc[pop_df["population"] < 0, "population"] = np.nan
        df = df.merge(pop_df[["ZCTA", "population"]], on="ZCTA", how="left")
    else:
        print("      WARNING: ACS population query failed; crime rates will be null.")
        df["population"] = np.nan

    print(f"      ACS data retrieved for {len(df)} ZCTAs.")
    return df


# ── STEP 5: CDC PLACES (Diabetes, Hypertension, Obesity) ────────────────────


def pull_places():
    """
    Pull CDC PLACES ZCTA-level health outcome data via Socrata API.
    Uses the generic column format (measureid, data_value) and pivots to wide format.

    Returns DataFrame with columns: ZCTA, diabetes, hypertension, obesity, asthma
    """
    print("[5/7] Pulling CDC PLACES data (diabetes, hypertension, obesity, asthma)...")

    url = "https://data.cdc.gov/resource/qnzd-25i4.csv"
    measures = ("DIABETES", "BPHIGH", "OBESITY", "CASTHMA")

    # Build ZCTA filter for SoQL
    zcta_list = ",".join(f"'{z}'" for z in TRAVIS_COUNTY_ZCTAS)
    measure_list = ",".join(f"'{m}'" for m in measures)
    params = {
        "$where": (
            f"locationid IN({zcta_list}) "
            f"AND measureid IN({measure_list}) "
            f"AND datavaluetypeid='CrdPrv'"
        ),
        "$select": "locationid,measureid,data_value",
        "$limit": 5000,
    }

    empty = pd.DataFrame(
        {
            "ZCTA": TRAVIS_COUNTY_ZCTAS,
            "diabetes": np.nan,
            "hypertension": np.nan,
            "obesity": np.nan,
            "asthma": np.nan,
        }
    )

    try:
        r = requests.get(url, params=params, timeout=60)
        r.raise_for_status()
        df = pd.read_csv(io.StringIO(r.text), dtype={"locationid": str})
    except requests.RequestException as e:
        print(f"      ERROR: Failed to pull CDC PLACES data: {e}")
        return empty

    if df.empty:
        print("      WARNING: CDC PLACES returned no data.")
        return empty

    df["data_value"] = pd.to_numeric(df["data_value"], errors="coerce")

    # Pivot from long to wide format
    pivot = df.pivot_table(
        index="locationid", columns="measureid", values="data_value", aggfunc="first"
    ).reset_index()
    pivot = pivot.rename(
        columns={
            "locationid": "ZCTA",
            "DIABETES": "diabetes",
            "BPHIGH": "hypertension",
            "OBESITY": "obesity",
            "CASTHMA": "asthma",
        }
    )
    pivot["ZCTA"] = pivot["ZCTA"].astype(str).str.zfill(5)

    # Ensure all expected columns exist
    for col in ["diabetes", "hypertension", "obesity", "asthma"]:
        if col not in pivot.columns:
            pivot[col] = np.nan

    print(f"      CDC PLACES data retrieved for {len(pivot)} ZCTAs.")
    return pivot[["ZCTA", "diabetes", "hypertension", "obesity", "asthma"]]


# ── STEP 6: APD Crime Reports → Violent Crime Rate per ZCTA ─────────────────


# UCR Part 1 violent offenses (NIBRS group A codes used by APD's `ucr_category` field).
# Source: FBI UCR / NIBRS — homicide, sex offenses (forcible), robbery, aggravated assault.
VIOLENT_UCR_CATEGORIES = ("09A", "11A", "11B", "11C", "120", "13A")

# Number of months back to count for the rolling rate window.
CRIME_WINDOW_MONTHS = 12

# APD only patrols inside City of Austin city limits — Cedar Park, Round Rock,
# Lakeway, etc. have their own PDs and are absent from APD's feed. To avoid
# painting those ZCTAs as "0 violent crime," we treat APD's jurisdiction as
# the set of 2020 tracts where APD has reported *any* UCR incident over the
# last few years and null out ZCTAs that are mostly outside that footprint.
JURISDICTION_LOOKBACK_YEARS = 2
JURISDICTION_COVERAGE_THRESHOLD = 0.5


def fetch_apd_jurisdiction_tracts(today: datetime.date) -> set[str]:
    """
    Approximate APD's jurisdiction footprint by collecting every 2020 tract
    where APD has reported *any* incident over the last few years. This
    distinguishes "APD reported zero violent crimes here" from "APD doesn't
    police this area."
    """
    url = "https://data.austintexas.gov/resource/fdj4-gpfu.json"
    cutoff = today - datetime.timedelta(days=365 * JURISDICTION_LOOKBACK_YEARS)
    params = {
        "$select": "census_block_group",
        "$where": (
            f"census_block_group IS NOT NULL "
            f"AND occ_date > '{cutoff.isoformat()}'"
        ),
        "$group": "census_block_group",
        "$limit": 50000,
    }
    try:
        r = requests.get(url, params=params, timeout=120)
        r.raise_for_status()
        records = r.json()
    except requests.RequestException as e:
        print(f"      WARNING: jurisdiction probe failed: {e}")
        return set()

    tracts: set[str] = set()
    for rec in records:
        bg = rec.get("census_block_group")
        if not bg:
            continue
        s = str(bg)
        full = s if (s.startswith("48") and len(s) >= 12) else "48" + s.zfill(10)
        tract = full[:11]
        if tract.startswith("48453"):
            tracts.add(tract)
    return tracts


def pull_violent_crime(xwalk_2020, acs_df):
    """
    Pull APD Crime Reports (Socrata fdj4-gpfu), filter to UCR Part 1 violent
    offenses over the most recent 12-month window, derive census tract from
    `census_block_group`, aggregate counts to ZCTA via the 2020-vintage
    land-area-weighted crosswalk (APD geocodes against 2020 tracts), and
    divide by population (per 1,000 residents).

    Returns DataFrame with columns: ZCTA, violentCrimeRate
    """
    print(
        f"[6/7] Pulling APD violent crime ({CRIME_WINDOW_MONTHS}-month rolling window)..."
    )

    url = "https://data.austintexas.gov/resource/fdj4-gpfu.json"

    # Rolling window cutoff
    today = datetime.date.today()
    cutoff = today - datetime.timedelta(days=int(CRIME_WINDOW_MONTHS * 30.5))
    cutoff_str = cutoff.isoformat()

    # Build APD's jurisdiction footprint up-front so we can null out ZCTAs
    # that fall mostly outside it (e.g. Cedar Park, Round Rock, Lakeway).
    served_tracts = fetch_apd_jurisdiction_tracts(today)
    print(
        f"      APD jurisdiction footprint: {len(served_tracts)} tracts "
        f"(any incident in last {JURISDICTION_LOOKBACK_YEARS}y)."
    )

    cat_list = ",".join(f"'{c}'" for c in VIOLENT_UCR_CATEGORIES)
    params = {
        "$where": (
            f"ucr_category IN({cat_list}) "
            f"AND occ_date > '{cutoff_str}' "
            f"AND census_block_group IS NOT NULL"
        ),
        "$select": "census_block_group",
        "$limit": 50000,
    }

    empty = pd.DataFrame(
        {"ZCTA": TRAVIS_COUNTY_ZCTAS, "violentCrimeRate": np.nan}
    )

    try:
        r = requests.get(url, params=params, timeout=120)
        r.raise_for_status()
        records = r.json()
    except requests.RequestException as e:
        print(f"      ERROR: Failed to pull APD crime data: {e}")
        return empty

    if not records:
        print("      WARNING: APD returned no violent crime rows.")
        return empty

    print(f"      Retrieved {len(records)} violent crime incidents since {cutoff_str}.")

    df = pd.DataFrame(records)
    df = df.dropna(subset=["census_block_group"])

    # APD strips the 2-char state FIPS — values are typically 10 chars
    # (county+tract+BG). Reconstruct the 12-char GEOID by prepending TX state
    # FIPS, then take the first 11 chars to get the tract GEOID. Filter out
    # any rows that don't resolve to Travis County (some are geocoder noise
    # like "4910204062" pointing at Utah).
    def to_tract(s: str) -> str:
        s = str(s)
        if s.startswith("48") and len(s) >= 12:
            full = s
        else:
            full = "48" + s.zfill(10)
        return full[:11]

    df["GEOID_TRACT"] = df["census_block_group"].apply(to_tract)
    df = df[df["GEOID_TRACT"].str.startswith("48453")]

    # Count incidents per tract
    tract_counts = (
        df.groupby("GEOID_TRACT").size().reset_index(name="incidents")
    )
    tract_counts["GEOID_TRACT"] = (
        tract_counts["GEOID_TRACT"].astype(str).str.zfill(11)
    )

    # Distribute tract incidents to ZCTAs via the 2020 land-area crosswalk.
    # res_ratio = fraction of tract land area in the ZCTA, so weighted
    # incidents in this ZCTA = incidents * res_ratio.
    merged = xwalk_2020.merge(tract_counts, on="GEOID_TRACT", how="left")
    merged["incidents"] = merged["incidents"].fillna(0)
    merged["weighted"] = merged["incidents"] * merged["res_ratio"]

    # Per-ZCTA APD coverage: fraction of the ZCTA's tract-area that lies in
    # APD-served tracts. Used to suppress rates for ZCTAs that are mostly
    # outside Austin city limits (Round Rock, Cedar Park, Lakeway, etc.).
    if served_tracts:
        merged["served"] = merged["GEOID_TRACT"].isin(served_tracts)
        merged["served_ratio"] = merged["res_ratio"] * merged["served"].astype(int)
        coverage = (
            merged.groupby("ZCTA")
            .apply(
                lambda g: (
                    g["served_ratio"].sum() / g["res_ratio"].sum()
                    if g["res_ratio"].sum() > 0
                    else 0.0
                ),
                include_groups=False,
            )
            .to_dict()
        )
    else:
        coverage = {}

    by_zcta = (
        merged.groupby("ZCTA")["weighted"].sum().reset_index(name="incidents")
    )
    by_zcta["coverage"] = by_zcta["ZCTA"].map(coverage).fillna(0.0)

    # Normalize per 1,000 residents using ACS population.
    pop_lookup = (
        acs_df.set_index("ZCTA")["population"]
        if "population" in acs_df.columns
        else None
    )

    # Suppress rates for very-low-population ZCTAs (e.g. 78712, the UT-Austin
    # campus ZIP) — small denominators turn a handful of incidents into wildly
    # high "rates" that dominate the choropleth color scale.
    MIN_POP_FOR_RATE = 1000

    def rate_for(z, count, cov):
        if served_tracts and cov < JURISDICTION_COVERAGE_THRESHOLD:
            return np.nan
        pop = pop_lookup.get(z) if pop_lookup is not None else None
        if pop is None or pd.isna(pop) or pop < MIN_POP_FOR_RATE:
            return np.nan
        return round((count / pop) * 1000, 2)

    by_zcta["violentCrimeRate"] = by_zcta.apply(
        lambda r: rate_for(r["ZCTA"], r["incidents"], r["coverage"]), axis=1
    )

    result = pd.DataFrame({"ZCTA": TRAVIS_COUNTY_ZCTAS}).merge(
        by_zcta[["ZCTA", "violentCrimeRate"]], on="ZCTA", how="left"
    )
    print(
        f"      Aggregated violent crime rate for {result['violentCrimeRate'].notna().sum()} ZCTAs."
    )
    return result


# ── HELPERS ──────────────────────────────────────────────────────────────────


def safe_value(val):
    """Convert a value for JSON output. NaN/sentinel -> None, else float."""
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return None
    val = float(val)
    if val in (SENTINEL_MISSING, SENTINEL_SUPPRESSED):
        return None
    return val


DATA_QUALITY_KEYS = [
    "lifeExpectancy",
    "povertyRate",
    "uninsuredRate",
    "diabetes",
    "hypertension",
    "obesity",
    "asthma",
    "violentCrimeRate",
]


def compute_data_quality(record):
    """Determine data quality based on presence of all main indicators."""
    values = [record.get(k) for k in DATA_QUALITY_KEYS]
    non_null = sum(1 for v in values if v is not None)
    if non_null == len(DATA_QUALITY_KEYS):
        return "complete"
    elif non_null == 0:
        return "missing"
    else:
        return "partial"


def compute_summary_stats(values):
    """Compute min, max, avg, median, p25, p75 from a list of non-null values."""
    clean = [v for v in values if v is not None]
    if not clean:
        return {
            "min": None,
            "max": None,
            "avg": None,
            "median": None,
            "p25": None,
            "p75": None,
        }
    arr = np.array(clean, dtype=float)
    return {
        "min": round(float(np.min(arr)), 2),
        "max": round(float(np.max(arr)), 2),
        "avg": round(float(np.mean(arr)), 2),
        "median": round(float(np.median(arr)), 2),
        "p25": round(float(np.percentile(arr, 25)), 2),
        "p75": round(float(np.percentile(arr, 75)), 2),
    }


# ── MAIN EXPORT ──────────────────────────────────────────────────────────────


def main():
    print("=" * 60)
    print("Export Frontend JSON Data for Austin Health Pulse")
    print("=" * 60)
    print()

    # Load Census crosswalks. 2010 vintage for USALEEP (uses 2010 tracts);
    # 2020 vintage for APD crime data (geocoded to 2020 tracts).
    xwalk = load_crosswalk()
    xwalk_2020 = load_crosswalk_2020()

    # Load life expectancy data
    le_df = load_life_expectancy(xwalk)

    # Load age-specific life table data
    age_specific = load_age_specific(xwalk)

    # Pull ACS and CDC PLACES data
    acs_df = pull_acs()
    places_df = pull_places()

    # Pull APD violent crime (uses 2020 crosswalk + ACS population)
    if xwalk_2020 is not None:
        crime_df = pull_violent_crime(xwalk_2020, acs_df)
    else:
        print("[6/7] SKIP: 2020 crosswalk unavailable; violent crime will be null.")
        crime_df = pd.DataFrame(
            {"ZCTA": TRAVIS_COUNTY_ZCTAS, "violentCrimeRate": np.nan}
        )

    print()
    print("[7/7] Building JSON output...")

    # Merge all data into a single DataFrame (for county-level stats)
    base = pd.DataFrame({"ZCTA": TRAVIS_COUNTY_ZCTAS})
    merged = base.merge(le_df, on="ZCTA", how="left")
    merged = merged.merge(acs_df, on="ZCTA", how="left")
    merged = merged.merge(places_df, on="ZCTA", how="left")
    merged = merged.merge(crime_df, on="ZCTA", how="left")

    # ── Build zcta_health_data.json ──

    zctas_dict = {}
    for _, row in merged.iterrows():
        zcta = row["ZCTA"]
        record = {
            "lifeExpectancy": safe_value(row.get("lifeExpectancy")),
            "lifeExpectancySE": safe_value(row.get("lifeExpectancySE")),
            "povertyRate": safe_value(row.get("povertyRate")),
            "uninsuredRate": safe_value(row.get("uninsuredRate")),
            "diabetes": safe_value(row.get("diabetes")),
            "hypertension": safe_value(row.get("hypertension")),
            "obesity": safe_value(row.get("obesity")),
            "asthma": safe_value(row.get("asthma")),
            "violentCrimeRate": safe_value(row.get("violentCrimeRate")),
        }

        # Add age-specific data if available
        if zcta in age_specific:
            record["ageSpecific"] = {}
            for ag in AGE_GROUPS:
                if ag in age_specific[zcta]:
                    record["ageSpecific"][ag] = {
                        "ex": age_specific[zcta][ag]["ex"],
                        "se": age_specific[zcta][ag]["se"],
                    }
                else:
                    record["ageSpecific"][ag] = {"ex": None, "se": None}
        else:
            record["ageSpecific"] = {ag: {"ex": None, "se": None} for ag in AGE_GROUPS}

        record["dataQuality"] = compute_data_quality(record)
        zctas_dict[zcta] = record

    # Compute county averages (mean of non-null values)
    county_avg = {}
    for key in DATA_QUALITY_KEYS:
        values = [
            zctas_dict[z][key] for z in zctas_dict if zctas_dict[z][key] is not None
        ]
        county_avg[key] = round(float(np.mean(values)), 2) if values else None

    health_data = {
        "meta": {
            "generated": datetime.date.today().isoformat(),
            "sources": {
                "lifeExpectancy": "CDC USALEEP (tract-level, pop-weighted to ZCTA)",
                "povertyRate": "ACS 5-Year 2022, Table S1701",
                "uninsuredRate": "ACS 5-Year 2022, Table S2701",
                "diabetes": "CDC PLACES 2023 (BRFSS model-based)",
                "hypertension": "CDC PLACES 2023 (BRFSS model-based)",
                "obesity": "CDC PLACES 2023 (BRFSS model-based)",
                "asthma": "CDC PLACES 2023 (current asthma, BRFSS model-based)",
                "violentCrimeRate": (
                    "City of Austin Open Data Portal — APD Crime Reports "
                    "(UCR Part 1 violent, rolling 12-month window, "
                    "tract-aggregated, per 1,000 residents)"
                ),
            },
            "countyAverage": county_avg,
        },
        "zctas": zctas_dict,
    }

    # ── Build county_summary.json ──

    indicators = {}

    indicator_config = {
        "lifeExpectancy": {"unit": "years", "higherIsBetter": True},
        "povertyRate": {"unit": "%", "higherIsBetter": False},
        "uninsuredRate": {"unit": "%", "higherIsBetter": False},
        "diabetes": {"unit": "%", "higherIsBetter": False},
        "hypertension": {"unit": "%", "higherIsBetter": False},
        "obesity": {"unit": "%", "higherIsBetter": False},
        "asthma": {"unit": "%", "higherIsBetter": False},
        "violentCrimeRate": {"unit": "per1k", "higherIsBetter": False},
    }

    for key, config in indicator_config.items():
        values = [zctas_dict[z][key] for z in zctas_dict]
        stats = compute_summary_stats(values)
        stats["unit"] = config["unit"]
        stats["higherIsBetter"] = config["higherIsBetter"]
        indicators[key] = stats

    complete_count = sum(
        1 for z in zctas_dict if zctas_dict[z]["dataQuality"] == "complete"
    )

    county_summary = {
        "indicators": indicators,
        "totalZctas": len(TRAVIS_COUNTY_ZCTAS),
        "zctasWithCompleteData": complete_count,
    }

    # ── Write output files ──

    os.makedirs(DATA_DIR, exist_ok=True)

    health_data_path = os.path.join(DATA_DIR, "zcta_health_data.json")
    with open(health_data_path, "w") as f:
        json.dump(health_data, f, indent=2, allow_nan=False, default=str)
    print(f"      Wrote {health_data_path}")
    print(
        f"      ({len(zctas_dict)} ZCTAs, {os.path.getsize(health_data_path) / 1024:.1f} KB)"
    )

    county_summary_path = os.path.join(DATA_DIR, "county_summary.json")
    with open(county_summary_path, "w") as f:
        json.dump(county_summary, f, indent=2, allow_nan=False, default=str)
    print(f"      Wrote {county_summary_path}")
    print(f"      ({os.path.getsize(county_summary_path) / 1024:.1f} KB)")

    # ── Print summary ──

    print()
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"  Total ZCTAs:          {len(TRAVIS_COUNTY_ZCTAS)}")
    print(f"  Complete data:        {complete_count}")
    partial_count = sum(
        1 for z in zctas_dict if zctas_dict[z]["dataQuality"] == "partial"
    )
    missing_count = sum(
        1 for z in zctas_dict if zctas_dict[z]["dataQuality"] == "missing"
    )
    print(f"  Partial data:         {partial_count}")
    print(f"  Missing data:         {missing_count}")
    print()
    print("  County averages:")
    for key, val in county_avg.items():
        unit = indicator_config[key]["unit"]
        if val is not None:
            print(f"    {key}: {val} {unit}")
        else:
            print(f"    {key}: N/A")
    print()
    print("Done.")


if __name__ == "__main__":
    main()
