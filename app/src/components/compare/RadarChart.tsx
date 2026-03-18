import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useHealthData } from "../../hooks/useHealthData";
import { APH_COLORS } from "../../lib/constants";
import type { IndicatorKey } from "../../types/health";
import { INDICATOR_HIGHER_IS_BETTER } from "../../types/health";

interface RadarChartProps {
  zctas: string[];
  colors: string[];
}

const RADAR_INDICATORS: { key: IndicatorKey; shortLabel: string }[] = [
  { key: "lifeExpectancy", shortLabel: "Life Exp." },
  { key: "povertyRate", shortLabel: "Poverty" },
  { key: "uninsuredRate", shortLabel: "Uninsured" },
  { key: "diabetes", shortLabel: "Diabetes" },
  { key: "hypertension", shortLabel: "Hypertension" },
  { key: "obesity", shortLabel: "Obesity" },
];

function normalize(
  value: number | null,
  min: number,
  max: number,
  higherIsBetter: boolean,
): number | null {
  if (value === null || max === min) return null;
  const raw = (value - min) / (max - min);
  const clamped = Math.max(0, Math.min(1, raw));
  // Invert for "higher is worse" so that higher on radar = healthier
  const normalized = higherIsBetter ? clamped : 1 - clamped;
  return Math.round(normalized * 100);
}

export default function RadarChart({ zctas, colors }: RadarChartProps) {
  const { healthData, summary } = useHealthData();

  if (!healthData || !summary || zctas.length === 0) return null;

  // Build data points for each indicator
  const data = RADAR_INDICATORS.map(({ key, shortLabel }) => {
    const ind = summary.indicators[key];
    const entry: Record<string, string | number | null> = {
      indicator: shortLabel,
      fullMark: 100,
    };

    for (const zcta of zctas) {
      const zctaData = healthData.zctas[zcta];
      const rawValue = zctaData?.[key] ?? null;
      entry[zcta] = normalize(
        rawValue,
        ind.min,
        ind.max,
        INDICATOR_HIGHER_IS_BETTER[key],
      );
    }

    return entry;
  });

  return (
    <div className="w-full bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-aph-dark-blue mb-4">
        Health Profile Comparison
      </h3>
      <p className="text-sm text-aph-dark-gray mb-4">
        Higher values indicate better health outcomes across all indicators.
      </p>
      <ResponsiveContainer width="100%" height={380}>
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke={APH_COLORS.lightGray} />
          <PolarAngleAxis
            dataKey="indicator"
            tick={{
              fontSize: 12,
              fill: APH_COLORS.darkBlue,
              fontFamily: "Geist, sans-serif",
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: APH_COLORS.darkGray }}
            tickCount={5}
          />
          {zctas.map((zcta, index) => (
            <Radar
              key={zcta}
              name={zcta}
              dataKey={zcta}
              stroke={colors[index]}
              fill={colors[index]}
              fillOpacity={0.15}
              strokeWidth={2}
              connectNulls
            />
          ))}
          <Tooltip
            contentStyle={{
              backgroundColor: "white",
              border: `1px solid ${APH_COLORS.lightGray}`,
              borderRadius: "8px",
              fontFamily: "Geist, sans-serif",
              fontSize: "13px",
            }}
            formatter={(value: unknown) =>
              value != null ? `${value}/100` : "N/A"
            }
          />
          <Legend
            wrapperStyle={{
              fontFamily: "Geist, sans-serif",
              fontSize: "13px",
              color: APH_COLORS.darkBlue,
            }}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
