"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { kroner, antall, dato } from "@/lib/format";

type Rad = {
  organisasjonsnummer: string;
  navn: string | null;
  naering: string | null;
  antall_ansatte: number | null;
  regnskapsperiode_til: string | null;
  sum_driftsinntekter: string | null;
  driftsresultat: string | null;
  aarsresultat: string | null;
  sum_egenkapital: string | null;
  driftsmargin: string | null;
  egenkapitalavkastning: string | null;
  egenkapitalandel: string | null;
};

const SORTS = [
  { key: "driftsresultat", navn: "Driftsresultat" },
  { key: "driftsinntekter", navn: "Driftsinntekter" },
  { key: "aarsresultat", navn: "Årsresultat" },
  { key: "egenkapital", navn: "Egenkapital" },
  { key: "driftsmargin", navn: "Driftsmargin" },
];

function prosent(v: string | null) {
  return v == null ? "–" : `${Number(v).toLocaleString("nb-NO")} %`;
}

export function Investering() {
  const [kommuner, setKommuner] = useState<{ kommune: string; antall: number }[]>([]);
  const [kommune, setKommune] = useState("");
  const [sort, setSort] = useState("driftsresultat");
  const [rader, setRader] = useState<Rad[]>([]);
  const [laster, setLaster] = useState(false);

  useEffect(() => {
    fetch("/api/kommuner").then((r) => r.json()).then((d) => setKommuner(d.kommuner ?? []));
  }, []);

  const last = useCallback(async (kom: string, s: string) => {
    if (!kom) return;
    setLaster(true);
    try {
      const r = await fetch(`/api/kommune-selskaper?kommune=${encodeURIComponent(kom)}&sort=${s}`);
      const d = await r.json();
      setRader(d.rader ?? []);
    } finally {
      setLaster(false);
    }
  }, []);

  useEffect(() => {
    if (kommune) last(kommune, sort);
  }, [kommune, sort, last]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs" style={{ color: "var(--muted)" }}>Kommune</label>
          <input
            list="kommuner"
            value={kommune}
            onChange={(e) => setKommune(e.target.value.toUpperCase())}
            placeholder="Velg kommune…"
            className="input mt-1"
            style={{ minWidth: 240 }}
          />
          <datalist id="kommuner">
            {kommuner.map((k) => (
              <option key={k.kommune} value={k.kommune}>{`${k.kommune} (${k.antall})`}</option>
            ))}
          </datalist>
        </div>
        <div>
          <label className="block text-xs" style={{ color: "var(--muted)" }}>Sorter etter</label>
          <div className="mt-1 flex flex-wrap gap-1">
            {SORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                style={{
                  background: sort === s.key ? "var(--accent)" : "rgba(255,255,255,0.04)",
                  color: sort === s.key ? "#fff" : "var(--muted)",
                }}
              >
                {s.navn}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!kommune && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Velg en kommune for å se de økonomisk sterkeste selskapene (topp 100, siste regnskap).
        </p>
      )}
      {laster && <p className="text-sm" style={{ color: "var(--muted)" }}>Laster…</p>}

      {rader.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm tabnum">
            <thead>
              <tr className="text-left" style={{ color: "var(--muted)" }}>
                <th className="px-3 py-2 font-medium">Selskap</th>
                <th className="px-3 py-2 font-medium">Næring</th>
                <th className="px-3 py-2 text-right font-medium">Driftsinntekter</th>
                <th className="px-3 py-2 text-right font-medium">Driftsresultat</th>
                <th className="px-3 py-2 text-right font-medium">Årsresultat</th>
                <th className="px-3 py-2 text-right font-medium">Margin</th>
                <th className="px-3 py-2 text-right font-medium">EK-avk.</th>
                <th className="px-3 py-2 text-right font-medium">Egenkapital</th>
                <th className="px-3 py-2 text-right font-medium">Ansatte</th>
              </tr>
            </thead>
            <tbody>
              {rader.map((r) => (
                <tr key={r.organisasjonsnummer} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/selskaper?orgnr=${r.organisasjonsnummer}`} className="hover:underline">
                      {r.navn ?? r.organisasjonsnummer}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: "var(--muted)" }}>{r.naering ?? "–"}</td>
                  <td className="px-3 py-2 text-right">{kroner(r.sum_driftsinntekter, { kompakt: true })}</td>
                  <td className="px-3 py-2 text-right">{kroner(r.driftsresultat, { kompakt: true })}</td>
                  <td className="px-3 py-2 text-right">{kroner(r.aarsresultat, { kompakt: true })}</td>
                  <td className="px-3 py-2 text-right">{prosent(r.driftsmargin)}</td>
                  <td className="px-3 py-2 text-right">{prosent(r.egenkapitalavkastning)}</td>
                  <td className="px-3 py-2 text-right">{kroner(r.sum_egenkapital, { kompakt: true })}</td>
                  <td className="px-3 py-2 text-right">{r.antall_ansatte != null ? antall(r.antall_ansatte) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
