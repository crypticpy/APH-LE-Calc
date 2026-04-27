import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { useHealthData } from "../../hooks/useHealthData";
import { APH_COLORS } from "../../lib/constants";
import type { IndicatorKey } from "../../types/health";
import { INDICATOR_LABELS, INDICATOR_UNITS } from "../../types/health";
import { formatValue } from "../../lib/formatters";

interface ComparisonBarChartProps {
  zctas: string[];
  colors: string[];
}

const INDICATORS: IndicatorKey[] = [
  "lifeExpectancy",
  "povertyRate",
  "uninsuredRate",
  "diabetes",
  "hypertension",
  "obesity",
  "asthma",
  "violentCrimeRate",
];

export default function ComparisonBarChart({
  zctas,
  colors,
}: ComparisonBarChartProps) {
  const { healthData } = useHealthData();

  if (!healthData || zctas.length === 0) return null;

  const countyAvg = healthData.meta.countyAverage;

  return (
    <div className="w-full bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-aph-dark-blue mb-2">
        Indicator Breakdown
      </h3>
      <p className="text-sm text-aph-dark-gray mb-6">
        Grouped bars per indicator with county average reference line.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {INDICATORS.map((key) => {
          const unit = INDICATOR_UNITS[key];
          const label = INDICATOR_LABELS[key];
          const avg = countyAvg[key];

          const chartData = [
            (() => {
              const entry: Record<string, string | number | null> = {
                name: label,
              };
              for (const zcta of zctas) {
                entry[zcta] = healthData.zctas[zcta]?.[key] ?? null;
              }
              return entry;
            })(),
          ];

          return (
            <div key={key}>
              <h4 className="text-sm font-semibold text-aph-dark-blue mb-2">
                {label}{" "}
                <span className="font-normal text-aph-dark-gray">({unit})</span>
              </h4>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={APH_COLORS.darkBlue}
                    opacity={0.15}
                  />
                  <XAxis dataKey="name" tick={false} axisLine={false} />
                  <YAxis
                    tick={{
                      fontSize: 11,
                      fill: APH_COLORS.darkGray,
                      fontFamily: "Geist, sans-serif",
                    }}
                    tickFormatter={(v: number) => formatValue(v, unit)}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: `1px solid ${APH_COLORS.lightGray}`,
                      borderRadius: "8px",
                      fontFamily: "Geist, sans-serif",
                      fontSize: "13px",
                    }}
                    formatter={(value: unknown, name: unknown) => [
                      value != null
                        ? formatValue(value as number, unit)
                        : "N/A",
                      String(name),
                    ]}
                  />
                  <Legend
                    wrapperStyle={{
                      fontFamily: "Geist, sans-serif",
                      fontSize: "12px",
                    }}
                  />
                  {zctas.map((zcta, index) => (
                    <Bar
                      key={zcta}
                      dataKey={zcta}
                      name={zcta}
                      fill={colors[index]}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={60}
                    />
                  ))}
                  <ReferenceLine
                    y={avg}
                    stroke={APH_COLORS.darkBlue}
                    strokeDasharray="6 3"
                    strokeWidth={2}
                    label={{
                      value: `Avg: ${formatValue(avg, unit)}`,
                      position: "insideTopRight",
                      style: {
                        fontSize: 10,
                        fill: APH_COLORS.darkBlue,
                        fontFamily: "Geist, sans-serif",
                        fontWeight: 600,
                      },
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
    </div>
  );
}
