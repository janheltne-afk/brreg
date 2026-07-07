"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LineChartCard } from "@/components/charts/LineChartCard";
import { antall, dato } from "@/lib/format";

type Data = {
  totaltAlleTid: string;
  medKjentDato: string;
  aarListe: { aar: number; antall: string }[];
  valgtAar: number | null;
  totalt: string;
  bransjer: { bransje: string; antall: string }[];
  kommuner: { kommune: string; antall: string }[];
  bransjeTrend: { aar: number; antall: string }[];
};

type Selskap = {
  organisasjonsnummer: string;
  navn: string | null;
  bransje: string | null;
  kommune: string | null;
  konkursdato: string | null;
};

function Rangliste({
  rader,
  onVelg,
  valgt,
}: {
  rader: { navn: string; antall: string }[];
  onVelg: (navn: string) => void;
  valgt: string;
}) {
  const [filter, setFilter] = useState("");
  const maks = rader.length ? Number(rader[0].antall) : 0;
  const synlige = filter
    ? rader.filter((r) => r.navn.toLowerCase().includes(filter.toLowerCase()))
    : rader;

  return (
    <div className="space-y-2">
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filtrer liste…"
        className="input py-1 text-sm"
      />
      <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
        {synlige.map((r) => (
          <div
            key={r.navn}
            role="button"
            tabIndex={0}
            onClick={() => onVelg(valgt === r.navn ? "" : r.navn)}
            className="flex items-center gap-3 text-sm"
            style={{ cursor: "pointer", fontWeight: valgt === r.navn ? 600 : undefined }}
          >
            <span
              className="w-40 shrink-0 truncate sm:w-56"
              title={r.navn}
              style={{ color: valgt === r.navn ? "var(--accent)" : undefined }}
            >
              {r.navn}
            </span>
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
        {synlige.length === 0 && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>Ingen treff.</p>
        )}
      </div>
      <p className="text-xs" style={{ color: "var(--muted)" }}>
        {antall(rader.length)} rader totalt · klikk en rad for å filtrere selskapslisten under
      </p>
    </div>
  );
}

export function Konkurser() {
  const [aar, setAar] = useState("");
  const [bransje, setBransje] = useState("");
  const [kommune, setKommune] = useState("");
  const [q, setQ] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [laster, setLaster] = useState(false);

  const [selskaper, setSelskaper] = useState<Selskap[]>([]);
  const [selskaperTotalt, setSelskaperTotalt] = useState(0);
  const [lasterSelskaper, setLasterSelskaper] = useState(false);

  useEffect(() => {
    setLaster(true);
    const p = new URLSearchParams();
    if (aar) p.set("aar", aar);
    if (bransje) p.set("bransje", bransje);
    fetch(`/api/konkurser?${p}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLaster(false));
  }, [aar, bransje]);

  const hentSelskaper = (offset: number, append: boolean) => {
    setLasterSelskaper(true);
    const p = new URLSearchParams({ offset: String(offset) });
    if (aar) p.set("aar", aar);
    if (bransje) p.set("bransje", bransje);
    if (kommune) p.set("kommune", kommune);
    if (q.trim()) p.set("q", q.trim());
    fetch(`/api/konkurser/selskaper?${p}`)
      .then((r) => r.json())
      .then((d) => {
        setSelskaper((prev) => (append ? [...prev, ...d.selskaper] : d.selskaper));
        setSelskaperTotalt(Number(d.totalt));
      })
      .finally(() => setLasterSelskaper(false));
  };

  useEffect(() => {
    hentSelskaper(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aar, bransje, kommune, q]);

  const kjentPct = data && Number(data.totaltAlleTid) > 0
    ? Math.round((Number(data.medKjentDato) / Number(data.totaltAlleTid)) * 100)
    : null;

  const harFilter = bransje || kommune || q;

  return (
    <div className="space-y-5">
      <div className="card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <div className="text-sm" style={{ color: "var(--muted)" }}>
              Registrerte konkurser {aar ? `· ${aar}` : "· alle år"}
            </div>
            <div className="mt-1 text-2xl font-semibold tabnum">{data ? antall(data.totalt) : "…"}</div>
          </div>
          <select
            value={aar}
            onChange={(e) => setAar(e.target.value)}
            className="input max-w-[10rem] py-1.5 text-sm"
          >
            <option value="">Alle år</option>
            {(data?.aarListe ?? []).map((a) => (
              <option key={a.aar} value={a.aar}>{a.aar} ({antall(a.antall)})</option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
          Kilde: Brønnøysundregistrenes enhetsregister (felt <code>konkurs</code>/<code>konkursdato</code>).
          Det frittstående Konkursregisteret (bostyrer, kunngjøringer) krever egen tilgangsavtale og inngår ikke her.
        </p>
        {data && kjentPct !== null && kjentPct < 95 && (
          <p
            className="mt-2 rounded-lg px-3 py-2 text-xs"
            style={{ background: "var(--panel-solid)", border: "1px solid var(--border)", color: "var(--muted)" }}
          >
            Kun {kjentPct} % av de {antall(data.totaltAlleTid)} konkursregistrerte selskapene har en
            registrert konkursdato ennå ({antall(data.medKjentDato)} stk). Selskaper som ble konkursregistrert
            før feltet ble lagt til får dato først når de blir berørt av en ny enhets-sync (eller ved en full
            re-seed). Årsfiltrering og trender over viser derfor foreløpig kun et utsnitt.
          </p>
        )}
      </div>

      {(bransje || kommune) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span style={{ color: "var(--muted)" }}>Filter:</span>
          {bransje && (
            <button
              onClick={() => setBransje("")}
              className="rounded-lg px-2.5 py-1 text-xs font-medium"
              style={{ border: "1px solid var(--border)", color: "var(--accent)" }}
            >
              Bransje: {bransje} ×
            </button>
          )}
          {kommune && (
            <button
              onClick={() => setKommune("")}
              className="rounded-lg px-2.5 py-1 text-xs font-medium"
              style={{ border: "1px solid var(--border)", color: "var(--accent)" }}
            >
              Kommune: {kommune} ×
            </button>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold">
            Flest konkurser per bransje {aar ? `(${aar})` : "(alle år)"}
          </h3>
          {laster && !data ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>Laster…</p>
          ) : (
            <Rangliste
              rader={(data?.bransjer ?? []).map((b) => ({ navn: b.bransje, antall: b.antall }))}
              onVelg={setBransje}
              valgt={bransje}
            />
          )}
        </div>

        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold">
            Flest konkurser per kommune {aar ? `(${aar})` : "(alle år)"}
          </h3>
          {laster && !data ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>Laster…</p>
          ) : (
            <Rangliste
              rader={(data?.kommuner ?? []).map((k) => ({ navn: k.kommune, antall: k.antall }))}
              onVelg={setKommune}
              valgt={kommune}
            />
          )}
        </div>
      </div>

      <LineChartCard
        title="Konkurser per år (alle bransjer, kun selskaper med kjent konkursdato)"
        data={(data?.aarListe ?? []).map((r) => ({ aar: r.aar, antall: Number(r.antall) })).sort((a, b) => a.aar - b.aar)}
        xKey="aar"
        yKey="antall"
      />

      {bransje && (
        <LineChartCard
          title={`Trend over år · ${bransje}`}
          data={(data?.bransjeTrend ?? []).map((r) => ({ aar: r.aar, antall: Number(r.antall) }))}
          xKey="aar"
          yKey="antall"
        />
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
          <h3 className="text-sm font-semibold">
            Selskaper <span style={{ color: "var(--muted)" }}>· {antall(selskaperTotalt)} treff</span>
          </h3>
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Søk selskapsnavn…"
              className="input max-w-[16rem] py-1 text-sm"
            />
            {harFilter && (
              <button
                onClick={() => { setBransje(""); setKommune(""); setQ(""); }}
                className="rounded-lg px-2.5 py-1 text-xs font-medium hover:opacity-80"
                style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
              >
                Nullstill
              </button>
            )}
          </div>
        </div>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: "var(--muted)" }}>
              <th className="px-4 py-2 font-medium">Selskap</th>
              <th className="px-4 py-2 font-medium">Bransje</th>
              <th className="px-4 py-2 font-medium">Kommune</th>
              <th className="px-4 py-2 font-medium">Konkursdato</th>
            </tr>
          </thead>
          <tbody>
            {selskaper.map((s) => (
              <tr key={s.organisasjonsnummer} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="px-4 py-2 font-medium">
                  <Link href={`/selskaper?orgnr=${s.organisasjonsnummer}`} className="hover:underline">
                    {s.navn ?? s.organisasjonsnummer}
                  </Link>
                </td>
                <td className="px-4 py-2" style={{ color: "var(--muted)" }}>{s.bransje ?? "–"}</td>
                <td className="px-4 py-2" style={{ color: "var(--muted)" }}>{s.kommune ?? "–"}</td>
                <td className="px-4 py-2" style={{ color: "var(--muted)" }}>{s.konkursdato ? dato(s.konkursdato) : "ukjent"}</td>
              </tr>
            ))}
            {selskaper.length === 0 && !lasterSelskaper && (
              <tr>
                <td colSpan={4} className="px-4 py-3" style={{ color: "var(--muted)" }}>Ingen selskaper funnet.</td>
              </tr>
            )}
          </tbody>
        </table>
        {lasterSelskaper && (
          <p className="px-4 py-3 text-sm" style={{ color: "var(--muted)" }}>Laster…</p>
        )}
        {!lasterSelskaper && selskaper.length < selskaperTotalt && (
          <div className="px-4 py-3">
            <button
              onClick={() => hentSelskaper(selskaper.length, true)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium hover:opacity-80"
              style={{ border: "1px solid var(--border)", color: "var(--accent)" }}
            >
              Last flere ({antall(selskaperTotalt - selskaper.length)} igjen)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
