"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = Record<string, string | number | null>;

export function BarChartCard({
  title,
  data,
  xKey,
  yKey,
  horizontal = false,
}: {
  title: string;
  data: Row[];
  xKey: string;
  yKey: string;
  horizontal?: boolean;
}) {
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <ResponsiveContainer width="100%" height={horizontal ? Math.max(220, data.length * 26) : 280}>
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 4, right: 12, bottom: 4, left: horizontal ? 8 : 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2a44" />
          {horizontal ? (
            <>
              <XAxis type="number" tick={{ fill: "#93a1bd", fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey={xKey}
                width={190}
                tick={{ fill: "#93a1bd", fontSize: 11 }}
              />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={{ fill: "#93a1bd", fontSize: 11 }} />
              <YAxis tick={{ fill: "#93a1bd", fontSize: 11 }} />
            </>
          )}
          <Tooltip
            contentStyle={{
              background: "#111a2e",
              border: "1px solid #1e2a44",
              borderRadius: 10,
              color: "#e6ecf7",
            }}
            formatter={(v: number) => new Intl.NumberFormat("nb-NO").format(v)}
          />
          <Bar dataKey={yKey} fill="#4f8cff" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
