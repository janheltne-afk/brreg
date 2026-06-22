"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { LineChartCard } from "@/components/charts/LineChartCard";
import { antall, kroner, dato } from "@/lib/format";

type Treff = {
  organisasjonsnummer: string;
  navn: string | null;
  organisasjonsform_kode: string | null;
  forr_poststed: string | null;
};

type Detalj = {
  enhet: Record<string, unknown> | null;
  regnskap: Record<string, unknown> | null;
  perAar: { aar: number; antall_eiere: number; sum_aksjer: string }[];
  sisteAar: number | null;
  toppEiere: {
    aksjonaer_navn: string;
    fodselsaar_orgnr: string | null;
    postnr_sted: string | null;
    aksjeklasse: string | null;
    antall_aksjer: string | null;
  }[];
};

export function SelskapSok({ initialOrgnr }: { initialOrgnr?: string }) {
  const [q, setQ] = useState("");
  const [treff, setTreff] = useState<Treff[]>([]);
  const [detalj, setDetalj] = useState<Detalj | null>(null);
  const [laster, setLaster] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastSelskap = useCallback(async (orgnr: string) => {
    setLaster(true);
    setTreff([]);
    try {
      const r = await fetch(`/api/selskap/${orgnr}`);
      setDetalj(await r.json());
    } finally {
      setLaster(false);
    }
  }, []);

  useEffect(() => {
    if (initialOrgnr) lastSelskap(initialOrgnr);
  }, [initialOrgnr, lastSelskap]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setTreff([]);
      return;
    }
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/sok-selskap?q=${encodeURIComponent(q.trim())}`);
      const d = await r.json();
      setTreff(d.treff ?? []);
    }, 250);
  }, [q]);

  const e = detalj?.enhet as Record<string, unknown> | null;
  const rg = detalj?.regnskap as Record<string, unknown> | null;

  return (
    <div className="space-y-5">
      <div className="relative max-w-xl">
        <input
          value={q}
          onChange={(ev) => setQ(ev.target.value)}
          placeholder="Søk selskap på navn eller organisasjonsnummer…"
          className="input"
        />
        {treff.length > 0 && (
          <ul
            className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl"
            style={{ background: "var(--panel-solid)", border: "1px solid var(--border)" }}
          >
            {treff.map((t) => (
              <li key={t.organisasjonsnummer}>
                <button
                  onClick={() => {
                    setQ(t.navn ?? "");
                    lastSelskap(t.organisasjonsnummer);
                  }}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:opacity-80"
                >
                  <span>{t.navn ?? t.organisasjonsnummer}</span>
                  <span style={{ color: "var(--muted)" }}>
                    {t.organisasjonsform_kode} · {t.forr_poststed ?? ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {laster && <p className="text-sm" style={{ color: "var(--muted)" }}>Laster…</p>}

      {e && (
        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-semibold">{String(e.navn ?? "")}</h2>
              <span className="text-sm" style={{ color: "var(--muted)" }}>
                Org.nr {String(e.organisasjonsnummer)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
              <Felt k="Form" v={`${e.organisasjonsform_kode ?? "–"}`} />
              <Felt k="Næring" v={`${e.naeringskode1_beskrivelse ?? "–"}`} />
              <Felt k="Ansatte" v={e.antall_ansatte != null ? antall(e.antall_ansatte as number) : "–"} />
              <Felt k="Sted" v={`${e.forr_poststed ?? "–"}`} />
              <Felt k="Stiftet" v={dato(e.stiftelsesdato as string)} />
              <Felt k="Status" v={e.konkurs ? "Konkurs" : e.under_avvikling ? "Under avvikling" : "Aktiv"} />
            </div>
          </div>

          {rg && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Mini k="Driftsinntekter" v={kroner(rg.sum_driftsinntekter as string, { kompakt: true })} />
              <Mini k="Driftsresultat" v={kroner(rg.driftsresultat as string, { kompakt: true })} />
              <Mini k="Årsresultat" v={kroner(rg.aarsresultat as string, { kompakt: true })} />
              <Mini k="Egenkapital" v={kroner(rg.sum_egenkapital as string, { kompakt: true })} />
            </div>
          )}

          {detalj && detalj.perAar.length > 0 && (
            <LineChartCard
              title="Antall aksjeeiere per år"
              data={detalj.perAar}
              xKey="aar"
              yKey="antall_eiere"
            />
          )}

          {detalj && detalj.toppEiere.length > 0 && (
            <div className="card overflow-x-auto">
              <h3 className="px-4 pt-4 text-sm font-semibold">
                Største aksjeeiere {detalj.sisteAar}
              </h3>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="text-left" style={{ color: "var(--muted)" }}>
                    <th className="px-4 py-2 font-medium">Eier</th>
                    <th className="px-4 py-2 font-medium">Født/orgnr</th>
                    <th className="px-4 py-2 font-medium">Sted</th>
                    <th className="px-4 py-2 font-medium">Klasse</th>
                    <th className="px-4 py-2 text-right font-medium">Antall aksjer</th>
                  </tr>
                </thead>
                <tbody>
                  {detalj.toppEiere.map((o, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="px-4 py-2 font-medium">{o.aksjonaer_navn}</td>
                      <td className="px-4 py-2" style={{ color: "var(--muted)" }}>{o.fodselsaar_orgnr ?? "–"}</td>
                      <td className="px-4 py-2" style={{ color: "var(--muted)" }}>{o.postnr_sted ?? "–"}</td>
                      <td className="px-4 py-2" style={{ color: "var(--muted)" }}>{o.aksjeklasse ?? "–"}</td>
                      <td className="px-4 py-2 text-right">{antall(o.antall_aksjer)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Felt({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-xs" style={{ color: "var(--muted)" }}>{k}</div>
      <div>{v}</div>
    </div>
  );
}

function Mini({ k, v }: { k: string; v: string }) {
  return (
    <div className="card p-3">
      <div className="text-xs" style={{ color: "var(--muted)" }}>{k}</div>
      <div className="mt-0.5 text-lg font-semibold">{v}</div>
    </div>
  );
}
