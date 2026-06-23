export function Melding({ tittel, tekst }: { tittel: string; tekst: string }) {
  return (
    <div className="card mx-auto max-w-lg p-8 text-center">
      <h2 className="text-lg font-semibold">{tittel}</h2>
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
        {tekst}
      </p>
    </div>
  );
}
