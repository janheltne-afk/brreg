"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LineChartCard } from "@/components/charts/LineChartCard";
import { antall, dato } from "@/lib/format";

type Data = {
  harSsb: boolean;
  aarListe: { aar: number; antall: string }[];
  sisteAar: number | null;
  valgtAar: number | null;
  kommuner: { kode: string; navn: string; antall: string }[];
  naeringer: { kode: string; navn: string; antall: string }[];
  naeringTrend: { aar: number; antall: string }[];
  paagaaende: string;
  paagaaendeMedDato: string;
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
  valgtKode,
}: {
  rader: { kode: string; navn: string; antall: string }[];
  onVelg: (kode: string, navn: string) => void;
  valgtKode: string;
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
            key={r.kode}
            role="button"
            tabIndex={0}
            onClick={() => onVelg(valgtKode === r.kode ? "" : r.kode, r.navn)}
            className="flex items-center gap-3 text-sm"
            style={{ cursor: "pointer", fontWeight: valgtKode === r.kode ? 600 : undefined }}
          >
            <span
              className="w-40 shrink-0 truncate sm:w-56"
              title={`${r.navn} — klikk for å se selskapene`}
              style={{ color: valgtKode === r.kode ? "var(--accent)" : undefined }}
            >
              {r.navn}
            </span>
            <div className="h-2 flex-1 rounded-full" style={{ background: "var(--border)" }}>
              <div
                className="h-2 rounded-full"
                style={{
                  width: maks ? `${(Number(r.antall) / maks) * 100}%` : "0%",
                  background: "var(--accent)",
                  opacity: valgtKode === r.kode ? 1 : 0.55,
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
        {antall(rader.length)} rader · klikk en rad for å se selskapene i listen nederst
      </p>
    </div>
  );
}

export function Konkurser() {
  const [aar, setAar] = useState("");
  const [kommune, setKommune] = useState<{ kode: string; navn: string } | null>(null);
  const [naering, setNaering] = useState<{ kode: string; navn: string } | null>(null);
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
    if (naering) p.set("naering", naering.kode);
    fetch(`/api/konkurser?${p}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLaster(false));
  }, [aar, naering]);

  const hentSelskaper = (offset: number, append: boolean) => {
    setLasterSelskaper(true);
    const p = new URLSearchParams({ offset: String(offset) });
    if (aar) p.set("aar", aar);
    if (kommune) p.set("kommunenr", kommune.kode);
    if (naering) p.set("naering", naering.kode);
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
  }, [aar, kommune, naering, q]);

  const visAar = data?.valgtAar ?? null;
  const erDelvisAar = Boolean(visAar && data?.sisteAar && visAar === data.sisteAar && visAar >= new Date().getFullYear());
  const landetTotalt = data?.aarListe.find((a) => a.aar === visAar)?.antall ?? null;
  const harFilter = Boolean(kommune || naering || q);

  return (
    <div className="space-y-5">
      {data && !data.harSsb && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{ border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--muted)" }}
        >
          Offisiell konkursstatistikk (SSB) er ikke lastet ennå. Kjør{" "}
          <code>python3 tools/load-konkurs-statistikk.py</code> for komplette tall per
          kommune, næring og år (2009–). Inntil da vises kun pågående konkursbo fra Enhetsregisteret.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="text-sm" style={{ color: "var(--muted)" }}>
              Åpnede konkurser {visAar ? `i ${visAar}` : ""}{erDelvisAar ? " (hittil i år)" : ""}
            </div>
            {data && data.aarListe.length > 0 && (
              <select value={aar || String(visAar ?? "")} onChange={(e) => setAar(e.target.value)} className="input max-w-[8.5rem] py-1 text-sm">
                {[...data.aarListe].reverse().map((a) => (
                  <option key={a.aar} value={a.aar}>{a.aar}</option>
                ))}
              </select>
            )}
          </div>
          <div className="mt-1 text-2xl font-semibold tabnum">
            {laster && !data ? "…" : landetTotalt != null ? antall(landetTotalt) : "–"}
          </div>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            Hele landet · offisiell statistikk fra SSB (tabell 12972)
          </p>
        </div>

        <div className="card p-4">
          <div className="text-sm" style={{ color: "var(--muted)" }}>Pågående konkursbo nå</div>
          <div className="mt-1 text-2xl font-semibold tabnum">{data ? antall(data.paagaaende) : "…"}</div>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            Fra Enhetsregisteret (konkurs-flagget). Ferdigbehandlede bo slettes fra
            registeret — selskapslisten nederst dekker derfor kun pågående bo.
          </p>
        </div>
      </div>

      {data && data.aarListe.length > 0 && (
        <LineChartCard
          title="Åpnede konkurser per år, hele landet (SSB)"
          data={data.aarListe.map((r) => ({ aar: r.aar, antall: Number(r.antall) }))}
          xKey="aar"
          yKey="antall"
        />
      )}

      {harFilter && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span style={{ color: "var(--muted)" }}>Aktive filter:</span>
          {kommune && (
            <button
              onClick={() => setKommune(null)}
              className="rounded-lg px-2.5 py-1 text-xs font-medium"
              style={{ border: "1px solid var(--border)", color: "var(--accent)" }}
            >
              Kommune: {kommune.navn} ×
            </button>
          )}
          {naering && (
            <button
              onClick={() => setNaering(null)}
              className="rounded-lg px-2.5 py-1 text-xs font-medium"
              style={{ border: "1px solid var(--border)", color: "var(--accent)" }}
            >
              Næring: {naering.navn} ×
            </button>
          )}
          {q && (
            <button
              onClick={() => setQ("")}
              className="rounded-lg px-2.5 py-1 text-xs font-medium"
              style={{ border: "1px solid var(--border)", color: "var(--accent)" }}
            >
              Søk: {q} ×
            </button>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold">
            Konkurser per kommune {visAar ? `(${visAar}${erDelvisAar ? ", hittil" : ""})` : ""}
            <span className="ml-2 font-normal text-xs" style={{ color: "var(--muted)" }}>SSB</span>
          </h3>
          {laster && !data ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>Laster…</p>
          ) : (
            <Rangliste
              rader={data?.kommuner ?? []}
              onVelg={(kode, navn) => setKommune(kode ? { kode, navn } : null)}
              valgtKode={kommune?.kode ?? ""}
            />
          )}
        </div>

        <div className="card p-4">
          <h3 className="mb-3 text-sm font-semibold">
            Konkurser per næring {visAar ? `(${visAar}${erDelvisAar ? ", hittil" : ""})` : ""}
            <span className="ml-2 font-normal text-xs" style={{ color: "var(--muted)" }}>SSB · hele landet</span>
          </h3>
          {laster && !data ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>Laster…</p>
          ) : (
            <Rangliste
              rader={data?.naeringer ?? []}
              onVelg={(kode, navn) => setNaering(kode ? { kode, navn } : null)}
              valgtKode={naering?.kode ?? ""}
            />
          )}
        </div>
      </div>

      {naering && (data?.naeringTrend?.length ?? 0) > 0 && (
        <LineChartCard
          title={`Konkurser per år · ${naering.navn} (SSB)`}
          data={(data?.naeringTrend ?? []).map((r) => ({ aar: r.aar, antall: Number(r.antall) }))}
          xKey="aar"
          yKey="antall"
        />
      )}

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
          <div>
            <h3 className="text-sm font-semibold">
              Selskaper med pågående konkursbo
              <span className="ml-2 font-normal" style={{ color: "var(--muted)" }}>{antall(selskaperTotalt)} treff</span>
            </h3>
            <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
              Kilde: Enhetsregisteret. Kun bo som ikke er ferdigbehandlet — eldre konkurser
              finnes i SSB-tallene over, men uten selskapsnavn (ikke åpne data).
            </p>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Søk selskapsnavn…"
            className="input max-w-[16rem] py-1 text-sm"
          />
        </div>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: "var(--muted)" }}>
              <th className="px-4 py-2 font-medium">Selskap</th>
              <th className="px-4 py-2 font-medium">Bransje</th>
              <th className="px-4 py-2 font-medium">Kommune</th>
              <th className="px-4 py-2 font-medium">Konkursåpning</th>
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
                <td className="px-4 py-2 tabnum" style={{ color: "var(--muted)" }}>{s.konkursdato ? dato(s.konkursdato) : "ukjent"}</td>
              </tr>
            ))}
            {selskaper.length === 0 && !lasterSelskaper && (
              <tr>
                <td colSpan={4} className="px-4 py-3" style={{ color: "var(--muted)" }}>
                  Ingen selskaper funnet{harFilter ? " med gjeldende filter" : ""}.
                  {data && Number(data.paagaaende) > 0 && Number(data.paagaaendeMedDato) === 0 && (
                    <> Konkursdato mangler i databasen — kjør <code>python3 tools/load-konkurser.py</code> for å fylle inn.</>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {lasterSelskaper && <p className="px-4 py-3 text-sm" style={{ color: "var(--muted)" }}>Laster…</p>}
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
