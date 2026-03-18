"""
Prepare ZCTA GeoJSON for Travis County
=======================================
Downloads Census cartographic boundary shapefile for ZCTAs, filters to
Travis County ZCTAs, simplifies geometry for web mapping, and exports GeoJSON.

Requirements:
    pip install geopandas requests

Output:
    app/public/data/zcta_boundaries.geojson
"""

import os
import sys
import io
import zipfile
import requests
import geopandas as gpd

# ── CONFIG ────────────────────────────────────────────────────────────────────

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "app", "public", "data")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "zcta_boundaries.geojson")

# Census cartographic boundary shapefile for ZCTAs (500k resolution)
SHAPEFILE_URL = (
    "https://www2.census.gov/geo/tiger/GENZ2020/shp/cb_2020_us_zcta520_500k.zip"
)

# Geometry simplification tolerance (degrees; ~0.001 is good for web mapping)
SIMPLIFY_TOLERANCE = 0.001

# Travis County ZCTAs (from existing pipeline fallback list)
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


def download_shapefile():
    """Download and extract Census ZCTA cartographic boundary shapefile."""
    print("[1/3] Downloading Census ZCTA boundary shapefile...")
    print(f"      URL: {SHAPEFILE_URL}")

    try:
        r = requests.get(SHAPEFILE_URL, timeout=300, stream=True)
        r.raise_for_status()
    except requests.RequestException as e:
        print(f"      ERROR: Failed to download shapefile: {e}")
        sys.exit(1)

    content_length = r.headers.get("Content-Length")
    if content_length:
        print(f"      Download size: {int(content_length) / 1024 / 1024:.1f} MB")

    # Read the full content for the zip
    data = r.content
    print(f"      Downloaded {len(data) / 1024 / 1024:.1f} MB")

    # Extract and read with geopandas
    print("      Extracting shapefile from zip archive...")
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            # Find the .shp file inside the zip
            shp_files = [f for f in zf.namelist() if f.endswith(".shp")]
            if not shp_files:
                print("      ERROR: No .shp file found in zip archive.")
                sys.exit(1)

            # Extract all files to a temporary directory
            import tempfile

            with tempfile.TemporaryDirectory() as tmpdir:
                zf.extractall(tmpdir)
                shp_path = os.path.join(tmpdir, shp_files[0])
                print(f"      Reading shapefile: {shp_files[0]}")
                gdf = gpd.read_file(shp_path, engine="pyogrio")
    except zipfile.BadZipFile:
        print("      ERROR: Downloaded file is not a valid zip archive.")
        sys.exit(1)

    print(f"      Loaded {len(gdf)} ZCTA boundaries nationwide.")
    return gdf


def filter_to_travis_county(gdf):
    """Filter the nationwide ZCTA GeoDataFrame to Travis County ZCTAs."""
    print("[2/3] Filtering to Travis County ZCTAs...")

    # The ZCTA column in the Census shapefile
    # Identify the ZCTA column name (varies by vintage)
    zcta_col = None
    for candidate in ["ZCTA5CE20", "ZCTA5CE10", "GEOID20", "GEOID"]:
        if candidate in gdf.columns:
            zcta_col = candidate
            break

    if zcta_col is None:
        print(
            f"      ERROR: Could not find ZCTA column. Available columns: {list(gdf.columns)}"
        )
        sys.exit(1)

    print(f"      Using column '{zcta_col}' for ZCTA matching.")

    # Ensure string type for matching
    gdf[zcta_col] = gdf[zcta_col].astype(str).str.zfill(5)

    # Filter to Travis County ZCTAs
    mask = gdf[zcta_col].isin(TRAVIS_COUNTY_ZCTAS)
    filtered = gdf[mask].copy()

    matched_zctas = set(filtered[zcta_col].tolist())
    requested_zctas = set(TRAVIS_COUNTY_ZCTAS)
    missing = requested_zctas - matched_zctas

    print(
        f"      Matched {len(filtered)} of {len(TRAVIS_COUNTY_ZCTAS)} requested ZCTAs."
    )
    if missing:
        print(f"      Not found in shapefile (likely PO Box ZCTAs): {sorted(missing)}")

    # Rename the ZCTA column to a consistent name
    filtered = filtered.rename(columns={zcta_col: "ZCTA5CE20"})

    # Keep only the ZCTA identifier and geometry
    keep_cols = ["ZCTA5CE20", "geometry"]
    extra_cols = [c for c in filtered.columns if c in keep_cols]
    filtered = filtered[extra_cols]

    return filtered


def simplify_and_export(gdf):
    """Simplify geometry and export as GeoJSON."""
    print("[3/3] Simplifying geometry and exporting GeoJSON...")

    # Simplify geometry for web performance
    gdf["geometry"] = gdf["geometry"].simplify(
        tolerance=SIMPLIFY_TOLERANCE,
        preserve_topology=True,
    )

    # Ensure CRS is WGS84 (EPSG:4326) for web mapping
    if gdf.crs and gdf.crs.to_epsg() != 4326:
        print(f"      Reprojecting from {gdf.crs} to EPSG:4326...")
        gdf = gdf.to_crs(epsg=4326)

    # Create output directory if needed
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Export to GeoJSON
    gdf.to_file(OUTPUT_FILE, driver="GeoJSON")

    file_size = os.path.getsize(OUTPUT_FILE) / 1024
    print(f"      Exported to: {OUTPUT_FILE}")
    print(f"      File size: {file_size:.1f} KB")
    print(f"      Features: {len(gdf)} ZCTAs")


def main():
    print("=" * 60)
    print("Prepare ZCTA GeoJSON for Travis County")
    print("=" * 60)
    print()

    gdf = download_shapefile()
    filtered = filter_to_travis_county(gdf)
    simplify_and_export(filtered)

    print()
    print("Done.")


if __name__ == "__main__":
    main()
