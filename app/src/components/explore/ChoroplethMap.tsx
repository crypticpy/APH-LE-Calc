import { useCallback, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import L from "leaflet";
import type { Feature, Geometry } from "geojson";
import type { IndicatorKey } from "../../types/health";
import {
  INDICATOR_LABELS,
  INDICATOR_UNITS,
  INDICATOR_HIGHER_IS_BETTER,
} from "../../types/health";
import { useHealthData } from "../../hooks/useHealthData";
import { getColorForValue } from "../../lib/colorScales";
import { formatValue } from "../../lib/formatters";
import { MAP_CONFIG, APH_COLORS } from "../../lib/constants";

interface ChoroplethMapProps {
  indicator: IndicatorKey;
  onZctaSelect: (zcta: string | null) => void;
  selectedZcta: string | null;
}

/** Format a number as an ordinal string (1st, 2nd, 3rd, 4th…). */
function toOrdinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** Extract the ZCTA code from a GeoJSON feature, trying common property names. */
function getZctaFromFeature(feature: Feature<Geometry>): string | null {
  const p = feature.properties;
  if (!p) return null;
  return (
    p.ZCTA5CE20 ??
    p.ZCTA5CE10 ??
    p.GEOID20 ??
    p.GEOID10 ??
    p.ZCTA ??
    p.zcta ??
    null
  );
}

export default function ChoroplethMap({
  indicator,
  onZctaSelect,
  selectedZcta,
}: ChoroplethMapProps) {
  const { healthData, summary, boundaries } = useHealthData();
  const highlightedRef = useRef<L.Layer | null>(null);

  const min = summary?.indicators[indicator]?.min ?? 0;
  const max = summary?.indicators[indicator]?.max ?? 100;
  const unit = INDICATOR_UNITS[indicator];

  /** Return the fill style for a single polygon. */
  const style = useCallback(
    (feature: Feature<Geometry> | undefined) => {
      if (!feature) {
        return {
          fillColor: APH_COLORS.lightGray,
          fillOpacity: 0.3,
          weight: 1,
          color: APH_COLORS.darkBlue,
          opacity: 0.6,
        };
      }

      const zcta = getZctaFromFeature(feature);
      const data = zcta ? healthData?.zctas[zcta] : null;
      const value = data ? (data[indicator] as number | null) : null;

      if (value === null || value === undefined) {
        return {
          fillColor: APH_COLORS.lightGray,
          fillOpacity: 0.3,
          weight: 1,
          color: APH_COLORS.darkBlue,
          opacity: 0.4,
        };
      }

      const isSelected = zcta === selectedZcta;

      return {
        fillColor: getColorForValue(value, min, max, indicator),
        fillOpacity: 0.7,
        weight: isSelected ? 3 : 1,
        color: APH_COLORS.darkBlue,
        opacity: isSelected ? 1 : 0.6,
      };
    },
    [healthData, indicator, min, max, selectedZcta],
  );

  /** Bind hover / click events on each polygon. */
  const onEachFeature = useCallback(
    (feature: Feature<Geometry>, layer: L.Layer) => {
      const zcta = getZctaFromFeature(feature);
      if (!zcta) return;

      const data = healthData?.zctas[zcta];
      const value = data ? (data[indicator] as number | null) : null;
      const label = INDICATOR_LABELS[indicator];
      const formatted = formatValue(value, unit);

      // Compute rank among all ZCTAs for this indicator
      let rankLine = "";
      if (value !== null && value !== undefined && healthData) {
        const higherIsBetter = INDICATOR_HIGHER_IS_BETTER[indicator];
        const allValues = Object.entries(healthData.zctas)
          .map(([z, d]) => ({ zcta: z, val: d[indicator] as number | null }))
          .filter((e): e is { zcta: string; val: number } => e.val != null);

        allValues.sort((a, b) =>
          higherIsBetter ? b.val - a.val : a.val - b.val,
        );

        const rank = allValues.findIndex((e) => e.zcta === zcta) + 1;
        if (rank > 0) {
          rankLine = `<span style="color:#636262;font-size:11px">${toOrdinal(rank)} of ${allValues.length} zip codes</span>`;
        }
      }

      // Tooltip
      (layer as L.Path).bindTooltip(
        `<div style="font-family:inherit;font-size:13px;">
          <strong>${zcta}</strong><br/>
          ${label}: ${formatted}${rankLine ? `<br/>${rankLine}` : ""}
        </div>`,
        { sticky: true, direction: "top", className: "zcta-tooltip" },
      );

      // Hover highlight
      (layer as L.Path).on({
        mouseover: () => {
          if (highlightedRef.current && highlightedRef.current !== layer) {
            const prev = highlightedRef.current as L.Path;
            const prevZcta = getZctaFromFeature(
              (prev as unknown as { feature: Feature<Geometry> }).feature,
            );
            if (prevZcta !== selectedZcta) {
              prev.setStyle({ weight: 1, opacity: 0.6 });
            }
          }
          (layer as L.Path).setStyle({ weight: 3, opacity: 1 });
          (layer as L.Path).bringToFront();
          highlightedRef.current = layer;
        },
        mouseout: () => {
          if (zcta !== selectedZcta) {
            (layer as L.Path).setStyle({ weight: 1, opacity: 0.6 });
          }
        },
        click: () => {
          onZctaSelect(zcta === selectedZcta ? null : zcta);
        },
      });
    },
    [healthData, indicator, unit, selectedZcta, onZctaSelect],
  );

  if (!boundaries) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-aph-white">
        <p className="text-aph-dark-gray text-sm">
          No boundary data available.
        </p>
      </div>
    );
  }

  return (
    <MapContainer
      center={MAP_CONFIG.center}
      zoom={MAP_CONFIG.zoom}
      minZoom={MAP_CONFIG.minZoom}
      maxZoom={MAP_CONFIG.maxZoom}
      style={{ width: "100%", height: "100%" }}
      zoomControl={true}
      attributionControl={true}
    >
      <TileLayer
        url={MAP_CONFIG.tileUrl}
        attribution={MAP_CONFIG.tileAttribution}
      />
      <GeoJSON
        key={`${indicator}-${selectedZcta ?? "none"}`}
        data={boundaries}
        style={style}
        onEachFeature={onEachFeature}
      />
    </MapContainer>
  );
}
