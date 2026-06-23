"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { LineChartCard } from "@/components/charts/LineChartCard";
import { antall, kroner } from "@/lib/format";

type Hist = { orgnr: string; selskap: string; aar: number; antall_aksjer: string; verdi: string | null };
type Treff = { navn: string; fodselsaar: string | null };
type Skatt = { aar: number; inntekt: string | null; formue: string | null; skatt: string | null; kommune: string | null; rang: number | null };
type Detalj = {
  navn: string;
  fodselsaar: string | null;
  perAar: { aar: number; antall_selskaper: number; sum_aksjer: string }[];
  historikk: Hist[];
  skatt: Skatt[];
};

export function AksjonaerSok() {
  const [q, setQ] = useState("");
  const [treff, setTreff] = useState<Treff[]>([]);
  const [detalj, setDetalj] = useState<Detalj | null>(null);
  const [laster, setLaster] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastNavn = useCallback(async (navn: string, fodselsaar: string | null) => {
    setLaster(true);
    setTreff([]);
    try {
      const r = await fetch(
        `/api/aksjonaer?navn=${encodeURIComponent(navn)}&fodselsaar=${encodeURIComponent(fodselsaar ?? "")}`);
      setDetalj(await r.json());
    } finally {
      setLaster(false);
    }
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 3) {
      setTreff([]);
      return;
    }
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/sok-aksjonaer?q=${encodeURIComponent(q.trim())}`);
      const d = await r.json();
      setTreff(d.treff ?? []);
    }, 250);
  }, [q]);

  // Pivot historikk → matrise (selskap × år), med antall + verdi per celle.
  const { aar, selskaper, celle } = useMemo(() => {
    const h = detalj?.historikk ?? [];
    const aarSet = new Set<number>();
    const selskapMap = new Map<string, string>();
    const celle = new Map<string, { antall: string; verdi: string | null }>();
    for (const r of h) {
      aarSet.add(r.aar);
      selskapMap.set(r.orgnr, r.selskap);
      celle.set(`${r.orgnr}|${r.aar}`, { antall: r.antall_aksjer, verdi: r.verdi });
    }
    const aar = [...aarSet].sort((a, b) => a - b);
    // Sorter selskaper etter siste kjente beholdning (størst først).
    const selskaper = [...selskapMap.entries()]
      .map(([orgnr, selskap]) => {
        let sist = 0;
        for (let i = aar.length - 1; i >= 0; i--) {
          const c = celle.get(`${orgnr}|${aar[i]}`);
          if (c != null) { sist = Number(c.antall); break; }
        }
        return { orgnr, selskap, sist };
      })
      .sort((a, b) => b.sist - a.sist);
    return { aar, selskaper, celle };
  }, [detalj]);

  return (
    <div className="space-y-6">
      <div className="relative max-w-xl">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Søk aksjeeier (navn, min. 3 tegn)…"
          className="input"
        />
        {treff.length > 0 && (
          <ul
            className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl"
            style={{ background: "var(--panel-solid)", border: "1px solid var(--border)" }}
          >
            {treff.map((t, i) => (
              <li key={`${t.navn}|${t.fodselsaar}|${i}`}>
                <button
                  onClick={() => { setQ(t.navn); lastNavn(t.navn, t.fodselsaar); }}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:opacity-80"
                >
                  <span>{t.navn}</span>
                  <span style={{ color: "var(--muted)" }}>{t.fodselsaar ?? "–"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {laster && <p className="text-sm" style={{ color: "var(--muted)" }}>Laster…</p>}

      {detalj && detalj.perAar.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-2xl font-bold">{detalj.navn}</h2>
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              {detalj.fodselsaar ? `f. ${detalj.fodselsaar} · ` : ""}
              {selskaper.length} selskap · aktiv {aar[0]}–{aar[aar.length - 1]}
            </span>
          </div>

          {detalj.skatt && detalj.skatt.length > 0 && (
            <div className="card overflow-x-auto">
              <h3 className="px-4 pt-4 text-sm font-semibold">
                Skatteliste <span style={{ color: "var(--muted)" }}>(offentlig: inntekt, formue, skatt per år)</span>
              </h3>
              <table className="mt-2 w-full text-sm tabnum">
                <thead>
                  <tr className="text-left" style={{ color: "var(--muted)" }}>
                    <th className="px-4 py-2 font-medium">År</th>
                    <th className="px-4 py-2 font-medium">Kommune</th>
                    <th className="px-4 py-2 text-right font-medium">Inntekt</th>
                    <th className="px-4 py-2 text-right font-medium">Formue</th>
                    <th className="px-4 py-2 text-right font-medium">Skatt</th>
                  </tr>
                </thead>
                <tbody>
                  {detalj.skatt.map((s) => (
                    <tr key={s.aar} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="px-4 py-2">{s.aar}</td>
                      <td className="px-4 py-2" style={{ color: "var(--muted)" }}>{s.kommune ?? "–"}</td>
                      <td className="px-4 py-2 text-right">{kroner(s.inntekt, { kompakt: true })}</td>
                      <td className="px-4 py-2 text-right font-medium">{kroner(s.formue, { kompakt: true })}</td>
                      <td className="px-4 py-2 text-right">{kroner(s.skatt, { kompakt: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <LineChartCard
            title="Antall selskaper eid per år"
            data={detalj.perAar}
            xKey="aar"
            yKey="antall_selskaper"
          />

          <div className="card overflow-x-auto">
            <h3 className="px-4 pt-4 text-sm font-semibold">
              Aksjeposter gjennom årene <span style={{ color: "var(--muted)" }}>(antall aksjer · <span style={{ color: "var(--accent)" }}>ca. verdi</span> der børskurs finnes)</span>
            </h3>
            <table className="mt-3 w-full text-sm tabnum">
              <thead>
                <tr style={{ color: "var(--muted)" }}>
                  <th
                    className="sticky left-0 px-4 py-2 text-left font-medium"
                    style={{ background: "var(--panel-solid)" }}
                  >
                    Selskap
                  </th>
                  {aar.map((a) => (
                    <th key={a} className="px-3 py-2 text-right font-medium">{a}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selskaper.map((s) => (
                  <tr key={s.orgnr} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td
                      className="sticky left-0 px-4 py-2 font-medium"
                      style={{ background: "var(--panel-solid)" }}
                    >
                      <Link href={`/selskaper?orgnr=${s.orgnr}`} className="hover:underline">
                        {s.selskap}
                      </Link>
                    </td>
                    {aar.map((a) => {
                      const c = celle.get(`${s.orgnr}|${a}`);
                      return (
                        <td
                          key={a}
                          className="px-3 py-2 text-right align-top"
                          style={{ color: c == null ? "var(--border)" : "var(--text)" }}
                        >
                          {c == null ? (
                            "·"
                          ) : (
                            <>
                              <div>{antall(c.antall)}</div>
                              {c.verdi && (
                                <div className="text-xs" style={{ color: "var(--accent)" }}>
                                  {kroner(c.verdi, { kompakt: true })}
                                </div>
                              )}
                            </>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
