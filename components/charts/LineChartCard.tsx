"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = Record<string, string | number | null>;

export function LineChartCard({
  title,
  data,
  xKey,
  yKey,
}: {
  title: string;
  data: Row[];
  xKey: string;
  yKey: string;
}) {
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2a44" />
          <XAxis dataKey={xKey} tick={{ fill: "#93a1bd", fontSize: 11 }} />
          <YAxis tick={{ fill: "#93a1bd", fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              background: "#111a2e",
              border: "1px solid #1e2a44",
              borderRadius: 10,
              color: "#e6ecf7",
            }}
            formatter={(v: number) => new Intl.NumberFormat("nb-NO").format(v)}
          />
          <Line type="monotone" dataKey={yKey} stroke="#4f8cff" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
