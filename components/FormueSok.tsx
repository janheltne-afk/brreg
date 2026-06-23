"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { LineChartCard } from "@/components/charts/LineChartCard";
import { antall, kroner } from "@/lib/format";

type Detalj = {
  navn: string;
  perAar: { aar: number; verdi: string; antall_selskaper: number }[];
  sisteAar: number | null;
  poster: { orgnr: string; selskap: string; antall_aksjer: string; kurs: string; verdi: string }[];
};

export function FormueSok() {
  const [q, setQ] = useState("");
  const [treff, setTreff] = useState<string[]>([]);
  const [detalj, setDetalj] = useState<Detalj | null>(null);
  const [laster, setLaster] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastNavn = useCallback(async (navn: string) => {
    setLaster(true);
    setTreff([]);
    try {
      const r = await fetch(`/api/formue?navn=${encodeURIComponent(navn)}`);
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

  const sisteVerdi = detalj?.perAar.length
    ? detalj.perAar[detalj.perAar.length - 1].verdi
    : null;

  return (
    <div className="space-y-6">
      <div className="relative max-w-xl">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Søk eier (navn, min. 3 tegn)…"
          className="input"
        />
        {treff.length > 0 && (
          <ul
            className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl"
            style={{ background: "var(--panel-solid)", border: "1px solid var(--border)" }}
          >
            {treff.map((navn) => (
              <li key={navn}>
                <button
                  onClick={() => { setQ(navn); lastNavn(navn); }}
                  className="w-full px-4 py-2 text-left text-sm hover:opacity-80"
                >
                  {navn}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {laster && <p className="text-sm" style={{ color: "var(--muted)" }}>Laster…</p>}

      {detalj && detalj.perAar.length > 0 ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">{detalj.navn}</h2>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Markedsverdi av børsnoterte aksjeposter
              </p>
            </div>
            {sisteVerdi && (
              <div className="text-right">
                <div className="text-3xl font-bold accent-text">{kroner(sisteVerdi, { kompakt: true })}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>verdi {detalj.sisteAar}</div>
              </div>
            )}
          </div>

          <LineChartCard
            title="Porteføljeverdi per år (kr)"
            data={detalj.perAar}
            xKey="aar"
            yKey="verdi"
          />

          <div className="card overflow-x-auto">
            <h3 className="px-4 pt-4 text-sm font-semibold">Beholdning {detalj.sisteAar}</h3>
            <table className="mt-2 w-full text-sm tabnum">
              <thead>
                <tr className="text-left" style={{ color: "var(--muted)" }}>
                  <th className="px-4 py-2 font-medium">Selskap</th>
                  <th className="px-4 py-2 text-right font-medium">Antall aksjer</th>
                  <th className="px-4 py-2 text-right font-medium">Kurs</th>
                  <th className="px-4 py-2 text-right font-medium">Verdi</th>
                </tr>
              </thead>
              <tbody>
                {detalj.poster.map((p, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-2 font-medium">
                      <Link href={`/selskaper?orgnr=${p.orgnr}`} className="hover:underline">
                        {p.selskap}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right">{antall(p.antall_aksjer)}</td>
                    <td className="px-4 py-2 text-right">{kroner(p.kurs)}</td>
                    <td className="px-4 py-2 text-right font-semibold">{kroner(p.verdi, { kompakt: true })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : detalj && !laster ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Ingen børsnoterte aksjeposter funnet for «{detalj.navn}». Verdi vises kun for
          selskaper med kjent børskurs (per nå de største på Oslo Børs).
        </p>
      ) : null}
    </div>
  );
}
