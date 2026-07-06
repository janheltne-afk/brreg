"use client";

import { useEffect, useState } from "react";
import { LineChartCard } from "@/components/charts/LineChartCard";
import { antall } from "@/lib/format";

type Data = {
  totalt: string;
  bransjer: { bransje: string; antall: string }[];
  perAar: { aar: number; antall: string }[];
  kommuner: { kommune: string; antall: string }[];
  valgtBransje: string;
  bransjeTrend: { aar: number; antall: string }[];
};

function Rangliste({
  rader,
  etikett,
  onVelg,
  valgt,
}: {
  rader: { navn: string; antall: string }[];
  etikett: string;
  onVelg?: (navn: string) => void;
  valgt?: string;
}) {
  const maks = rader.length ? Number(rader[0].antall) : 0;
  return (
    <div className="space-y-1.5">
      {rader.map((r) => (
        <div
          key={r.navn}
          role={onVelg ? "button" : undefined}
          tabIndex={onVelg ? 0 : undefined}
          onClick={onVelg ? () => onVelg(r.navn) : undefined}
          className="flex items-center gap-3 text-sm"
          style={{ cursor: onVelg ? "pointer" : undefined, fontWeight: valgt === r.navn ? 600 : undefined }}
        >
          <span className="w-40 shrink-0 truncate sm:w-56" title={r.navn}>{r.navn}</span>
          <div className="h-2 flex-1 rounded-full" style={{ background: "var(--border)" }}>
            <div
              className="h-2 rounded-full"
              style={{
                width: maks ? `${(Number(r.antall) / maks) * 100}%` : "0%",
                background: valgt === r.navn ? "#4f8cff" : "var(--accent)",
              }}
            />
          </div>
          <span className="w-14 shrink-0 text-right tabnum" style={{ color: "var(--muted)" }}>
            {antall(r.antall)}
          </span>
        </div>
      ))}
      {rader.length === 0 && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>Ingen data for {etikett}.</p>
      )}
    </div>
  );
}

export function Konkurser() {
  const [bransje, setBransje] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [laster, setLaster] = useState(false);

  useEffect(() => {
    setLaster(true);
    fetch(`/api/konkurser?bransje=${encodeURIComponent(bransje)}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLaster(false));
  }, [bransje]);

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <div className="text-sm" style={{ color: "var(--muted)" }}>Registrerte konkurser</div>
        <div className="mt-1 text-2xl font-semibold tabnum">{data ? antall(data.totalt) : "…"}</div>
        <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
          Kilde: Brønnøysundregistrenes enhetsregister (felt <code>konkurs</code>/<code>konkursdato</code>).
          Det frittstående Konkursregisteret (bostyrer, kunngjøringer) krever egen tilgangsavtale og inngår ikke her.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold">Flest konkurser per bransje</h3>
          {laster && !data ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>Laster…</p>
          ) : (
            <Rangliste
              rader={(data?.bransjer ?? []).map((b) => ({ navn: b.bransje, antall: b.antall }))}
              etikett="bransjer"
              onVelg={setBransje}
              valgt={bransje || data?.valgtBransje}
            />
          )}
        </div>

        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold">Flest konkurser per kommune</h3>
          {laster && !data ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>Laster…</p>
          ) : (
            <Rangliste
              rader={(data?.kommuner ?? []).map((k) => ({ navn: k.kommune, antall: k.antall }))}
              etikett="kommuner"
            />
          )}
        </div>
      </div>

      <LineChartCard
        title="Konkurser per år (alle bransjer)"
        data={(data?.perAar ?? []).map((r) => ({ aar: r.aar, antall: Number(r.antall) }))}
        xKey="aar"
        yKey="antall"
      />

      <div className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Trend for valgt bransje</h3>
          <select
            value={bransje || data?.valgtBransje || ""}
            onChange={(e) => setBransje(e.target.value)}
            className="input max-w-[18rem] py-1 text-sm"
          >
            {(data?.bransjer ?? []).map((b) => (
              <option key={b.bransje} value={b.bransje}>{b.bransje}</option>
            ))}
          </select>
        </div>
        <LineChartCard
          title={data?.valgtBransje ?? ""}
          data={(data?.bransjeTrend ?? []).map((r) => ({ aar: r.aar, antall: Number(r.antall) }))}
          xKey="aar"
          yKey="antall"
        />
      </div>
    </div>
  );
}
