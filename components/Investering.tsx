"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { kroner, antall } from "@/lib/format";

type SelskapRad = {
  organisasjonsnummer: string;
  navn: string | null;
  naering: string | null;
  antall_ansatte: number | null;
  sum_driftsinntekter: string | null;
  driftsresultat: string | null;
  aarsresultat: string | null;
  sum_egenkapital: string | null;
  driftsmargin: string | null;
  egenkapitalavkastning: string | null;
};

type PersonRad = {
  navn: string;
  fodselsaar: number;
  aar: number;
  inntekt: string | null;
  formue: string | null;
  skatt: string | null;
  rang: number;
};

const SELSKAP_SORTS = [
  { key: "driftsresultat", navn: "Driftsresultat" },
  { key: "driftsinntekter", navn: "Driftsinntekter" },
  { key: "aarsresultat", navn: "Årsresultat" },
  { key: "egenkapital", navn: "Egenkapital" },
  { key: "driftsmargin", navn: "Driftsmargin" },
];
const PERSON_SORTS = [
  { key: "formue", navn: "Formue" },
  { key: "inntekt", navn: "Inntekt" },
  { key: "skatt", navn: "Skatt" },
];

function prosent(v: string | null) {
  return v == null ? "–" : `${Number(v).toLocaleString("nb-NO")} %`;
}

export function Investering() {
  const [kommuner, setKommuner] = useState<{ kommune: string; antall: number }[]>([]);
  const [kommune, setKommune] = useState("");
  const [visning, setVisning] = useState<"selskaper" | "personer">("selskaper");
  const [sort, setSort] = useState("driftsresultat");
  const [persSort, setPersSort] = useState("formue");
  const [selskaper, setSelskaper] = useState<SelskapRad[]>([]);
  const [personer, setPersoner] = useState<PersonRad[]>([]);
  const [persAar, setPersAar] = useState<number | null>(null);
  const [laster, setLaster] = useState(false);

  useEffect(() => {
    fetch("/api/kommuner").then((r) => r.json()).then((d) => setKommuner(d.kommuner ?? []));
  }, []);

  const last = useCallback(async (kom: string, v: string, s: string, ps: string) => {
    if (!kom) return;
    setLaster(true);
    try {
      if (v === "selskaper") {
        const r = await fetch(`/api/kommune-selskaper?kommune=${encodeURIComponent(kom)}&sort=${s}`);
        setSelskaper((await r.json()).rader ?? []);
      } else {
        const r = await fetch(`/api/kommune-personer?kommune=${encodeURIComponent(kom)}&sort=${ps}`);
        const d = await r.json();
        setPersoner(d.rader ?? []);
        setPersAar(d.aar ?? null);
      }
    } finally {
      setLaster(false);
    }
  }, []);

  useEffect(() => {
    if (kommune) last(kommune, visning, sort, persSort);
  }, [kommune, visning, sort, persSort, last]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4">
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
        <div className="flex gap-1">
          {(["selskaper", "personer"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVisning(v)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors"
              style={{
                background: visning === v ? "var(--accent)" : "rgba(255,255,255,0.04)",
                color: visning === v ? "#fff" : "var(--muted)",
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs" style={{ color: "var(--muted)" }}>Sorter etter</label>
        <div className="mt-1 flex flex-wrap gap-1">
          {(visning === "selskaper" ? SELSKAP_SORTS : PERSON_SORTS).map((s) => {
            const aktiv = visning === "selskaper" ? sort === s.key : persSort === s.key;
            return (
              <button
                key={s.key}
                onClick={() => (visning === "selskaper" ? setSort(s.key) : setPersSort(s.key))}
                className="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
                style={{
                  background: aktiv ? "var(--accent)" : "rgba(255,255,255,0.04)",
                  color: aktiv ? "#fff" : "var(--muted)",
                }}
              >
                {s.navn}
              </button>
            );
          })}
        </div>
      </div>

      {!kommune && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Velg en kommune for å se de økonomisk sterkeste selskapene – eller bytt til «Personer»
          for de med høyest formue/inntekt (fra skattelistene).
        </p>
      )}
      {laster && <p className="text-sm" style={{ color: "var(--muted)" }}>Laster…</p>}

      {kommune && !laster && visning === "selskaper" && selskaper.length > 0 && (
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
                <th className="px-3 py-2 text-right font-medium">Ansatte</th>
              </tr>
            </thead>
            <tbody>
              {selskaper.map((r) => (
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
                  <td className="px-3 py-2 text-right">{r.antall_ansatte != null ? antall(r.antall_ansatte) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {kommune && !laster && visning === "personer" && personer.length > 0 && (
        <div className="card overflow-x-auto">
          <h3 className="px-3 pt-3 text-sm font-semibold">
            Personer i {kommune} {persAar && <span style={{ color: "var(--muted)" }}>· skatteliste {persAar}</span>}
          </h3>
          <table className="mt-2 w-full text-sm tabnum">
            <thead>
              <tr className="text-left" style={{ color: "var(--muted)" }}>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Navn</th>
                <th className="px-3 py-2 font-medium">Født</th>
                <th className="px-3 py-2 text-right font-medium">Inntekt</th>
                <th className="px-3 py-2 text-right font-medium">Formue</th>
                <th className="px-3 py-2 text-right font-medium">Skatt</th>
              </tr>
            </thead>
            <tbody>
              {personer.map((p, i) => (
                <tr key={`${p.navn}|${p.fodselsaar}|${i}`} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-3 py-2" style={{ color: "var(--muted)" }}>{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{p.navn}</td>
                  <td className="px-3 py-2" style={{ color: "var(--muted)" }}>{p.fodselsaar ?? "–"}</td>
                  <td className="px-3 py-2 text-right">{kroner(p.inntekt, { kompakt: true })}</td>
                  <td className="px-3 py-2 text-right font-medium">{kroner(p.formue, { kompakt: true })}</td>
                  <td className="px-3 py-2 text-right">{kroner(p.skatt, { kompakt: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
