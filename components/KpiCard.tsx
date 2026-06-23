export function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && (
        <div className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}
