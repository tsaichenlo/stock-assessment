import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyAggregate } from "../types";

export function ResultsChart({ rows }: { rows: DailyAggregate[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={rows} margin={{ top: 8, right: 24, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="day" tick={{ fontSize: 12 }} minTickGap={24} />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fontSize: 12 }}
          width={72}
          tickFormatter={(v: number) => v.toFixed(2)}
        />
        <Tooltip
          formatter={(value) =>
            typeof value === "number" ? value.toFixed(4) : String(value)
          }
          labelStyle={{ fontWeight: 600 }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="lowAverage"
          name="Low average"
          stroke="#2563eb"
          dot={false}
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="highAverage"
          name="High average"
          stroke="#16a34a"
          dot={false}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
