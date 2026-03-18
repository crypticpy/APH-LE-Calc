"""
Travis County Health Data Pull & Merge
=======================================
Pulls and merges data from three sources for all ZCTAs in or crossing Travis County, TX:
  1. ACS 5-Year (2022) — Poverty Rate, Uninsured Rate
  2. CDC PLACES (2023)  — Diabetes, Hypertension, Obesity prevalence
  3. CDC USALEEP        — Life Expectancy (tract → ZCTA via HUD crosswalk)

Requirements:
    pip install requests pandas openpyxl

Census API Key:
    Get a free key at: https://api.census.gov/data/key_signup.html
    Set it in the CENSUS_API_KEY variable below (or as env var CENSUS_API_KEY).

Output:
    travis_county_health_merged.csv  — ArcGIS-ready, one row per ZCTA
"""

import os
import sys
import requests
import pandas as pd
import io

# ── CONFIG ────────────────────────────────────────────────────────────────────

CENSUS_API_KEY = os.environ.get("CENSUS_API_KEY", "YOUR_API_KEY_HERE")

# Travis County FIPS
TRAVIS_COUNTY_FIPS = "48453"
STATE_FIPS = "48"  # Texas

# ArcGIS suppression codes
MISSING_CODE = 88888
SUPPRESSED_CODE = 99999

# ── STEP 1: Get Travis County ZCTAs from Census relationship file ─────────────

def get_travis_zctas():
    """
    Downloads the Census 2020 ZCTA-to-County relationship file and filters
    to ZCTAs that intersect Travis County (FIPS 48453).
    Source: https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt
    """
    print("[1/4] Fetching Travis County ZCTA list from Census relationship file...")
    url = "https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt"
    
    try:
        r = requests.get(url, timeout=60)
        r.raise_for_status()
        df = pd.read_csv(io.StringIO(r.text), sep="|", dtype=str)
        
        # Filter to Travis County
        travis = df[df["GEOID_COUNTY_20"] == TRAVIS_COUNTY_FIPS]
        zctas = sorted(travis["GEOID_ZCTA5_20"].unique().tolist())
        print(f"    Found {len(zctas)} ZCTAs intersecting Travis County.")
        return zctas
    except Exception as e:
        print(f"    WARNING: Could not download ZCTA relationship file: {e}")
        print("    Falling back to known Travis County ZCTA list.")
        return FALLBACK_TRAVIS_ZCTAS


# Fallback list if network is unavailable
FALLBACK_TRAVIS_ZCTAS = [
    "78610","78613","78617","78620","78621","78634","78640","78641",
    "78642","78644","78645","78646","78652","78653","78660","78664",
    "78669","78676","78681","78701","78702","78703","78704","78705",
    "78712","78717","78719","78721","78722","78723","78724","78725",
    "78726","78727","78728","78729","78730","78731","78732","78733",
    "78734","78735","78736","78737","78738","78739","78741","78742",
    "78744","78745","78746","78747","78748","78749","78750","78751",
    "78752","78753","78754","78756","78757","78758","78759",
    "78772","78773","78774","78778","78779","78783","78799"
]


# ── STEP 2: ACS Pull (Poverty + Uninsured) ────────────────────────────────────

def pull_acs(zctas):
    """
    Pulls ACS 5-Year 2022 subject tables for all Texas ZCTAs, then filters
    to Travis County ZCTAs.

    Tables:
      S1701_C03_001E  = Poverty rate (% below poverty level, all people)
      S2701_C05_001E  = Uninsured rate (% uninsured, civilian noninstitutionalized)

    API docs: https://api.census.gov/data/2022/acs/acs5/subject/variables.html
    """
    print("[2/4] Pulling ACS 5-Year 2022 data (poverty + uninsured)...")

    base_url = "https://api.census.gov/data/2022/acs/acs5/subject"
    params = {
        "get": "NAME,S1701_C03_001E,S2701_C05_001E",
        "for": "zip code tabulation area:*",
        "in": f"state:{STATE_FIPS}",
        "key": CENSUS_API_KEY,
    }

    try:
        r = requests.get(base_url, params=params, timeout=60)
        r.raise_for_status()
        data = r.json()
        df = pd.DataFrame(data[1:], columns=data[0])
        df = df.rename(columns={
            "zip code tabulation area": "ZCTA",
            "S1701_C03_001E": "PovertyRate_Pct",
            "S2701_C05_001E": "UninsuredRate_Pct",
        })
        df["ZCTA"] = df["ZCTA"].str.zfill(5)
        df = df[df["ZCTA"].isin(zctas)][["ZCTA","PovertyRate_Pct","UninsuredRate_Pct"]]

        # Convert to numeric; negative ACS sentinel values → suppression codes
        for col in ["PovertyRate_Pct","UninsuredRate_Pct"]:
            df[col] = pd.to_numeric(df[col], errors="coerce")
            df[col] = df[col].apply(lambda x: SUPPRESSED_CODE if pd.notna(x) and x < 0 else x)

        print(f"    ACS pull successful: {len(df)} ZCTAs matched.")
        return df

    except Exception as e:
        print(f"    ERROR pulling ACS data: {e}")
        print("    Returning empty ACS dataframe — fill manually.")
        return pd.DataFrame({"ZCTA": zctas, "PovertyRate_Pct": MISSING_CODE, "UninsuredRate_Pct": MISSING_CODE})


# ── STEP 3: CDC PLACES Pull (Diabetes, Hypertension, Obesity) ─────────────────

def pull_places(zctas):
    """
    Pulls CDC PLACES 2023 ZCTA-level health outcome data via Socrata API.
    Filters to Texas ZCTAs, then to Travis County ZCTAs.

    Variables:
      DIABETES_CrudePrev  = Diagnosed diabetes among adults ≥18
      BPHIGH_CrudePrev    = High blood pressure among adults ≥18
      OBESITY_CrudePrev   = Obesity (BMI ≥30) among adults ≥18

    Dataset: https://data.cdc.gov/resource/qnzd-25i4.csv
    Docs:    https://data.cdc.gov/500-Cities-Places/PLACES-ZCTA-Data-GIS-Friendly-Format-2023-release/qnzd-25i4
    """
    print("[3/4] Pulling CDC PLACES 2023 data (diabetes, hypertension, obesity)...")

    url = "https://data.cdc.gov/resource/qnzd-25i4.csv"
    params = {
        "StateAbbr": "TX",
        "$limit": 5000,
        "$select": "LocationID,DIABETES_CrudePrev,BPHIGH_CrudePrev,OBESITY_CrudePrev",
    }

    try:
        r = requests.get(url, params=params, timeout=60)
        r.raise_for_status()
        df = pd.read_csv(io.StringIO(r.text), dtype={"LocationID": str})
        df["LocationID"] = df["LocationID"].str.zfill(5)
        df = df[df["LocationID"].isin(zctas)]
        df = df.rename(columns={
            "LocationID": "ZCTA",
            "DIABETES_CrudePrev": "Diabetes_CrudePrev_Pct",
            "BPHIGH_CrudePrev": "Hypertension_CrudePrev_Pct",
            "OBESITY_CrudePrev": "Obesity_CrudePrev_Pct",
        })

        for col in ["Diabetes_CrudePrev_Pct","Hypertension_CrudePrev_Pct","Obesity_CrudePrev_Pct"]:
            df[col] = pd.to_numeric(df[col], errors="coerce")

        print(f"    CDC PLACES pull successful: {len(df)} ZCTAs matched.")
        return df

    except Exception as e:
        print(f"    ERROR pulling CDC PLACES data: {e}")
        print("    Returning empty PLACES dataframe — fill manually.")
        return pd.DataFrame({
            "ZCTA": zctas,
            "Diabetes_CrudePrev_Pct": MISSING_CODE,
            "Hypertension_CrudePrev_Pct": MISSING_CODE,
            "Obesity_CrudePrev_Pct": MISSING_CODE,
        })


# ── STEP 4: CDC USALEEP Life Expectancy (Tract → ZCTA via HUD crosswalk) ──────

def pull_life_expectancy(zctas):
    """
    Downloads CDC USALEEP tract-level life expectancy for Texas, then aggregates
    to ZCTA using the HUD USPS ZIP-Tract crosswalk (population-weighted average).

    USALEEP source: https://www.cdc.gov/nchs/nvss/usaleep/usaleep.html
    HUD crosswalk:  https://www.huduser.gov/portal/datasets/usps_crosswalk.html

    Steps:
      a) Download TX USALEEP file (tract-level e(0))
      b) Download HUD TRACT→ZIP crosswalk for TX
      c) Merge and compute population-weighted average life expectancy per ZCTA
    """
    print("[4/4] Pulling CDC USALEEP life expectancy (tract → ZCTA)...")

    # a) USALEEP Texas tract data
    usaleep_url = "https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Datasets/USALEEP/USALEEP/TX_A.xlsx"
    # b) HUD TRACT→ZIP crosswalk (Q4 2022, latest stable)
    hud_url = "https://www.huduser.gov/portal/datasets/usps/TRACT_ZIP_122022.xlsx"

    try:
        print("    Downloading USALEEP Texas file...")
        r_usaleep = requests.get(usaleep_url, timeout=120)
        r_usaleep.raise_for_status()
        le_df = pd.read_excel(io.BytesIO(r_usaleep.content), dtype={"Tract ID": str})

        # USALEEP columns: 'Tract ID', 'e(0)', 'SE', '95% CI (Lower)', '95% CI (Upper)'
        le_df = le_df.rename(columns={"Tract ID": "GEOID_TRACT", "e(0)": "LifeExpectancy_Years"})
        le_df["GEOID_TRACT"] = le_df["GEOID_TRACT"].str.zfill(11)
        le_df = le_df[["GEOID_TRACT","LifeExpectancy_Years"]]
        le_df["LifeExpectancy_Years"] = pd.to_numeric(le_df["LifeExpectancy_Years"], errors="coerce")

        print("    Downloading HUD TRACT→ZIP crosswalk...")
        r_hud = requests.get(hud_url, timeout=120)
        r_hud.raise_for_status()
        xwalk = pd.read_excel(io.BytesIO(r_hud.content), dtype=str)

        # HUD columns: tract, zip, usps_zip_pref_city, usps_zip_pref_state, res_ratio, ...
        xwalk.columns = [c.lower() for c in xwalk.columns]
        xwalk = xwalk.rename(columns={"tract": "GEOID_TRACT", "zip": "ZCTA"})
        xwalk["GEOID_TRACT"] = xwalk["GEOID_TRACT"].str.zfill(11)
        xwalk["ZCTA"] = xwalk["ZCTA"].str.zfill(5)
        xwalk["res_ratio"] = pd.to_numeric(xwalk["res_ratio"], errors="coerce")

        # Merge tracts → ZIPs
        merged = xwalk.merge(le_df, on="GEOID_TRACT", how="left")
        merged = merged[merged["ZCTA"].isin(zctas)]

        # Population-weighted average life expectancy per ZCTA
        merged["weighted_le"] = merged["LifeExpectancy_Years"] * merged["res_ratio"]
        agg = merged.groupby("ZCTA").apply(
            lambda g: g["weighted_le"].sum() / g["res_ratio"].sum()
            if g["res_ratio"].sum() > 0 else float("nan")
        ).reset_index()
        agg.columns = ["ZCTA","LifeExpectancy_Years"]
        agg["LifeExpectancy_Years"] = agg["LifeExpectancy_Years"].round(2)

        print(f"    Life expectancy aggregated for {len(agg)} ZCTAs.")
        return agg

    except Exception as e:
        print(f"    ERROR pulling life expectancy data: {e}")
        print("    Returning empty life expectancy dataframe — fill manually.")
        print(f"    Manual download: {usaleep_url}")
        return pd.DataFrame({"ZCTA": zctas, "LifeExpectancy_Years": MISSING_CODE})


# ── STEP 5: Merge & Export ────────────────────────────────────────────────────

def merge_and_export(zctas, acs_df, places_df, le_df):
    """
    Merges all three data sources into one ArcGIS-ready CSV.
    Fills unmatched ZCTAs with suppression code 88888 (missing/not available).
    """
    print("\n[Merging] Combining all sources...")

    base = pd.DataFrame({"ZCTA": zctas})
    df = base.merge(acs_df, on="ZCTA", how="left")
    df = df.merge(places_df, on="ZCTA", how="left")
    df = df.merge(le_df, on="ZCTA", how="left")

    # Add metadata columns
    df.insert(1, "County", "Travis County, TX (or cross-county ZCTA)")
    df.insert(2, "State", "TX")

    # Fill any remaining NaN with missing code
    numeric_cols = [
        "PovertyRate_Pct","UninsuredRate_Pct",
        "Diabetes_CrudePrev_Pct","Hypertension_CrudePrev_Pct",
        "Obesity_CrudePrev_Pct","LifeExpectancy_Years"
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = df[col].fillna(MISSING_CODE)

    # Add source and year columns for ArcGIS metadata
    df["PovertyRate_Source"] = "ACS 5-Year 2022, Table S1701"
    df["UninsuredRate_Source"] = "ACS 5-Year 2022, Table S2701 / B27001"
    df["Diabetes_Source"] = "CDC PLACES 2023 (BRFSS model-based)"
    df["Hypertension_Source"] = "CDC PLACES 2023 (BRFSS model-based)"
    df["Obesity_Source"] = "CDC PLACES 2023 (BRFSS model-based)"
    df["LifeExpectancy_Source"] = "CDC USALEEP (tract, pop-weighted to ZCTA)"
    df["DataNote"] = "77777=N/A | 88888=Missing | 99999=Suppressed"

    output_path = "travis_county_health_merged.csv"
    df.to_csv(output_path, index=False)
    print(f"\n✅ Done! Output saved to: {output_path}")
    print(f"   Rows: {len(df)} ZCTAs  |  Columns: {len(df.columns)}")
    print(f"\n   Column summary:")
    for col in df.columns:
        print(f"     {col}")
    return df


# ── MAIN ──────────────────────────────────────────────────────────────────────

def main():
    if CENSUS_API_KEY == "YOUR_API_KEY_HERE":
        print("⚠️  WARNING: No Census API key set.")
        print("   Get a free key at: https://api.census.gov/data/key_signup.html")
        print("   Then set it: export CENSUS_API_KEY=your_key_here")
        print("   Continuing — ACS pull may fail or be rate-limited without a key.\n")

    zctas = get_travis_zctas()
    acs_df = pull_acs(zctas)
    places_df = pull_places(zctas)
    le_df = pull_life_expectancy(zctas)
    merge_and_export(zctas, acs_df, places_df, le_df)


if __name__ == "__main__":
    main()
