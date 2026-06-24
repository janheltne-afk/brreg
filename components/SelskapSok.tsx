"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
  kurs: string | null;
  roller: { rolletype_kode: string; rolletype_beskrivelse: string; person_navn: string | null; person_fodselsdato: string | null; enhet_navn: string | null }[];
  toppEiere: {
    aksjonaer_navn: string;
    fodselsaar_orgnr: string | null;
    postnr_sted: string | null;
    aksjeklasse: string | null;
    antall_aksjer: string | null;
    verdi: string | null;
  }[];
  eierHistorikk: {
    aksjonaer_navn: string;
    fodselsaar_orgnr: string | null;
    aar: number;
    antall: string;
    verdi: string | null;
  }[];
  eierHistorikkStor?: boolean;
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

  // Pivot eierhistorikk → matrise (eier × år), antall + verdi per celle.
  const { eierAar, eiere, eierCelle } = useMemo(() => {
    const h = detalj?.eierHistorikk ?? [];
    const aarSet = new Set<number>();
    const eierMap = new Map<string, { navn: string; fodsel: string | null }>();
    const celle = new Map<string, { antall: string; verdi: string | null }>();
    for (const r of h) {
      const key = `${r.aksjonaer_navn}|${r.fodselsaar_orgnr ?? ""}`;
      aarSet.add(r.aar);
      eierMap.set(key, { navn: r.aksjonaer_navn, fodsel: r.fodselsaar_orgnr });
      celle.set(`${key}|${r.aar}`, { antall: r.antall, verdi: r.verdi });
    }
    const eierAar = [...aarSet].sort((a, b) => a - b);
    // Sorter eiere etter siste kjente beholdning (størst først).
    const eiere = [...eierMap.entries()]
      .map(([key, v]) => {
        let sist = 0;
        for (let i = eierAar.length - 1; i >= 0; i--) {
          const c = celle.get(`${key}|${eierAar[i]}`);
          if (c != null) { sist = Number(c.antall); break; }
        }
        return { key, ...v, sist };
      })
      .sort((a, b) => b.sist - a.sist);
    return { eierAar, eiere, eierCelle: celle };
  }, [detalj]);

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
              <div className="flex flex-wrap items-center gap-2">
                <CopyOrgnr orgnr={String(e.organisasjonsnummer)} />
                <a
                  href="https://rettsstiftelser.brreg.no/nb/oppslag#virksomhet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg px-2.5 py-1 text-xs font-medium hover:opacity-80"
                  style={{ border: "1px solid var(--border)", color: "var(--accent)" }}
                  title="Åpne Rettsstiftelser (lim inn org.nr for å se pant, utlegg m.m.)"
                >
                  Rettsstiftelser ↗
                </a>
              </div>
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

          {detalj && detalj.roller && detalj.roller.length > 0 && (
            <div className="card p-4">
              <h3 className="mb-3 text-sm font-semibold">Styre og roller</h3>
              <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
                {detalj.roller.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 border-b pb-1.5" style={{ borderColor: "var(--border)" }}>
                    <span style={{ color: "var(--muted)" }}>{r.rolletype_beskrivelse}</span>
                    <span className="text-right font-medium">
                      {r.person_navn ?? r.enhet_navn ?? "–"}
                      {r.person_fodselsdato && (
                        <span className="ml-1 font-normal" style={{ color: "var(--muted)" }}>
                          ({String(r.person_fodselsdato).slice(0, 4)})
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
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
                {detalj.kurs && (
                  <span className="ml-2 font-normal" style={{ color: "var(--muted)" }}>
                    · børskurs {kroner(detalj.kurs)} ({detalj.sisteAar})
                  </span>
                )}
              </h3>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="text-left" style={{ color: "var(--muted)" }}>
                    <th className="px-4 py-2 font-medium">Eier</th>
                    <th className="px-4 py-2 font-medium">Født/orgnr</th>
                    <th className="px-4 py-2 font-medium">Sted</th>
                    <th className="px-4 py-2 font-medium">Klasse</th>
                    <th className="px-4 py-2 text-right font-medium">Antall aksjer</th>
                    <th className="px-4 py-2 text-right font-medium">Verdi</th>
                  </tr>
                </thead>
                <tbody>
                  {detalj.toppEiere.map((o, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="px-4 py-2 font-medium">{o.aksjonaer_navn}</td>
                      <td className="px-4 py-2" style={{ color: "var(--muted)" }}>{o.fodselsaar_orgnr ?? "–"}</td>
                      <td className="px-4 py-2" style={{ color: "var(--muted)" }}>{o.postnr_sted ?? "–"}</td>
                      <td className="px-4 py-2" style={{ color: "var(--muted)" }}>{o.aksjeklasse ?? "–"}</td>
                      <td className="px-4 py-2 text-right tabnum">{antall(o.antall_aksjer)}</td>
                      <td className="px-4 py-2 text-right tabnum font-medium">{o.verdi ? kroner(o.verdi, { kompakt: true }) : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {eiere.length > 0 && eierAar.length > 1 && (
            <div className="card overflow-x-auto">
              <h3 className="px-4 pt-4 text-sm font-semibold">
                Eierskap gjennom årene{" "}
                <span style={{ color: "var(--muted)" }}>
                  (antall aksjer · <span style={{ color: "var(--accent)" }}>ca. verdi</span> der børskurs finnes)
                </span>
              </h3>
              <table className="mt-3 w-full text-sm tabnum">
                <thead>
                  <tr style={{ color: "var(--muted)" }}>
                    <th
                      className="sticky left-0 px-4 py-2 text-left font-medium"
                      style={{ background: "var(--panel-solid)" }}
                    >
                      Eier
                    </th>
                    {eierAar.map((a) => (
                      <th key={a} className="px-3 py-2 text-right font-medium">{a}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {eiere.map((o) => (
                    <tr key={o.key} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td
                        className="sticky left-0 px-4 py-2 font-medium"
                        style={{ background: "var(--panel-solid)" }}
                      >
                        {o.navn}
                        {o.fodsel && (
                          <span className="ml-1 text-xs font-normal" style={{ color: "var(--muted)" }}>
                            {o.fodsel}
                          </span>
                        )}
                      </td>
                      {eierAar.map((a) => {
                        const c = eierCelle.get(`${o.key}|${a}`);
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
          )}

          {detalj && detalj.eierHistorikkStor && (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Eierskap gjennom årene vises ikke for svært store selskaper (mange tusen
              aksjeeiere). Tabellen over viser de største eierne for {detalj.sisteAar}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CopyOrgnr({ orgnr }: { orgnr: string }) {
  const [kopiert, setKopiert] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(orgnr);
          setKopiert(true);
          setTimeout(() => setKopiert(false), 1500);
        } catch {}
      }}
      className="rounded-lg px-2.5 py-1 text-xs font-medium hover:opacity-80"
      style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
      title="Kopiér organisasjonsnummeret"
    >
      {kopiert ? "Kopiert ✓" : `Org.nr ${orgnr} ⧉`}
    </button>
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
