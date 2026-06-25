"use client";

import { useEffect, useRef, useState } from "react";
import { antall } from "@/lib/format";

type Data = {
  aar: number | null;
  gruppe: string;
  grupper: string[];
  totalt: string;
  antallMerker: number;
  merker: { merke: string; antall: string }[];
};

export function Kjoretoy() {
  const [gruppe, setGruppe] = useState("Personbiler");
  const [q, setQ] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [laster, setLaster] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLaster(true);
      try {
        const r = await fetch(
          `/api/kjoretoy?gruppe=${encodeURIComponent(gruppe)}&q=${encodeURIComponent(q.trim())}`
        );
        setData(await r.json());
      } finally {
        setLaster(false);
      }
    }, 200);
  }, [gruppe, q]);

  const grupper = data?.grupper?.length ? data.grupper : [gruppe];
  const maks = data?.merker?.length ? Number(data.merker[0].antall) : 0;

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

      <div className="flex flex-wrap items-center gap-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Søk bilmerke…"
          className="input max-w-xs"
        />
        {data && data.aar && (
          <span className="text-sm" style={{ color: "var(--muted)" }}>
            {antall(data.totalt)} {gruppe.toLowerCase()} · {data.antallMerker} merker · {data.aar}
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
