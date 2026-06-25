"use client";

import { useEffect, useRef, useState } from "react";
import { antall } from "@/lib/format";

type Drivstoff = { drivstoff: string; antall: string };
type Data = {
  aar: number | null;
  gruppe: string;
  grupper: string[];
  totalt: string;
  antallMerker: number;
  merker: { merke: string; antall: string }[];
  region: string;
  regionNavn: string | null;
  regionTotal: string;
  drivstoff: Drivstoff[];
  kommuner: { kode: string; navn: string }[];
};

// Fargekoder per drivstofftype for søyle/fordeling.
const FARGE: Record<string, string> = {
  "El.": "#34d399",
  Bensin: "#fbbf24",
  Diesel: "#94a3b8",
  "Annet drivstoff": "#a78bfa",
  Gass: "#60a5fa",
  Parafin: "#f87171",
};

export function Kjoretoy() {
  const [gruppe, setGruppe] = useState("Personbiler");
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("0");
  const [data, setData] = useState<Data | null>(null);
  const [laster, setLaster] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLaster(true);
      try {
        const r = await fetch(
          `/api/kjoretoy?gruppe=${encodeURIComponent(gruppe)}&q=${encodeURIComponent(
            q.trim()
          )}&region=${encodeURIComponent(region)}`
        );
        setData(await r.json());
      } finally {
        setLaster(false);
      }
    }, 200);
  }, [gruppe, q, region]);

  const grupper = data?.grupper?.length ? data.grupper : [gruppe];
  const maks = data?.merker?.length ? Number(data.merker[0].antall) : 0;
  const drivstoffSum = (data?.drivstoff ?? []).reduce((s, d) => s + Number(d.antall), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        {grupper.map((g) => (
          <button
            key={g}
            onClick={() => setGruppe(g)}
            className="rounded-lg px-3 py-1.5 text-sm font-medium"
            style={{
              border: "1px solid var(--border)",
              background: g === gruppe ? "var(--accent)" : "transparent",
              color: g === gruppe ? "#fff" : "var(--muted)",
            }}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Drivstoff-fordeling for valgt region */}
      {data && data.drivstoff.length > 0 && (
        <div className="card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">
              Drivstoff · {data.regionNavn ?? "Hele landet"}
              <span className="ml-2 font-normal" style={{ color: "var(--muted)" }}>
                {antall(data.regionTotal)} {gruppe.toLowerCase()}
              </span>
            </h3>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="input max-w-[14rem] py-1 text-sm"
            >
              <option value="0">Hele landet</option>
              {data.kommuner.map((k) => (
                <option key={k.kode} value={k.kode}>{k.navn}</option>
              ))}
            </select>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
            {data.drivstoff.map((d) => (
              <div
                key={d.drivstoff}
                style={{
                  width: drivstoffSum ? `${(Number(d.antall) / drivstoffSum) * 100}%` : "0%",
                  background: FARGE[d.drivstoff] ?? "var(--accent)",
                }}
                title={`${d.drivstoff}: ${antall(d.antall)}`}
              />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
            {data.drivstoff.map((d) => (
              <div key={d.drivstoff} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: FARGE[d.drivstoff] ?? "var(--accent)" }} />
                  {d.drivstoff}
                </span>
                <span className="tabnum" style={{ color: "var(--muted)" }}>
                  {antall(d.antall)} · {drivstoffSum ? Math.round((Number(d.antall) / drivstoffSum) * 100) : 0} %
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Merke-liste (nasjonalt) */}
      <div className="flex flex-wrap items-center gap-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Søk bilmerke…"
          className="input max-w-xs"
        />
        {data && data.aar && (
          <span className="text-sm" style={{ color: "var(--muted)" }}>
            {antall(data.totalt)} {gruppe.toLowerCase()} · {data.antallMerker} merker · hele landet {data.aar}
          </span>
        )}
      </div>

      {laster && !data && <p className="text-sm" style={{ color: "var(--muted)" }}>Laster…</p>}

      {data && data.merker.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: "var(--muted)" }}>
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Merke</th>
                <th className="px-4 py-2 text-right font-medium">Antall</th>
                <th className="hidden px-4 py-2 font-medium sm:table-cell" style={{ width: "40%" }}></th>
              </tr>
            </thead>
            <tbody>
              {data.merker.map((m, i) => (
                <tr key={m.merke} className="border-t" style={{ borderColor: "var(--border)" }}>
                  <td className="px-4 py-2" style={{ color: "var(--muted)" }}>{i + 1}</td>
                  <td className="px-4 py-2 font-medium">{m.merke}</td>
                  <td className="px-4 py-2 text-right tabnum">{antall(m.antall)}</td>
                  <td className="hidden px-4 py-2 sm:table-cell">
                    <div className="h-2 rounded-full" style={{ background: "var(--border)" }}>
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: maks ? `${(Number(m.antall) / maks) * 100}%` : "0%",
                          background: "var(--accent)",
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.merker.length === 0 && !laster && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>Ingen merker matcher søket.</p>
      )}
    </div>
  );
}
