"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { BokmerkeKnapp } from "@/components/BokmerkeKnapp";
import { antall, kroner, dato } from "@/lib/format";

type Hist = { orgnr: string; selskap: string; aar: number; antall_aksjer: string; verdi: string | null };
type Treff = { navn: string; fodselsaar: string | null; erAksjonaer?: boolean; harRolle?: boolean; sted?: string | null };
type Skatt = { aar: number; inntekt: string | null; formue: string | null; skatt: string | null; kommune: string | null; rang: number | null };
type Rolle = {
  orgnr: string;
  selskap: string | null;
  rolletype_kode: string;
  rolletype_beskrivelse: string;
  fratraadt: boolean | null;
  sist_endret: string | null;
};
type Detalj = {
  navn: string;
  fodselsaar: string | null;
  perAar: { aar: number; antall_selskaper: number; sum_aksjer: string }[];
  historikk: Hist[];
  skatt: Skatt[];
  roller: Rolle[];
};

export function AksjonaerSok({ initialNavn, initialFodselsaar }: { initialNavn?: string; initialFodselsaar?: string }) {
  const [q, setQ] = useState("");
  const [treff, setTreff] = useState<Treff[]>([]);
  const [detalj, setDetalj] = useState<Detalj | null>(null);
  const [laster, setLaster] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Notater (CRM): per bruker, per person, søkbart.
  const [notat, setNotat] = useState("");
  const [notatStatus, setNotatStatus] = useState<"" | "lagrer" | "lagret">("");
  const notatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notatSok, setNotatSok] = useState("");
  const [notatTreff, setNotatTreff] = useState<{ navn: string; fodselsaar: string; notat: string; kilde?: string }[]>([]);
  const [kontakter, setKontakter] = useState<
    { navn: string; telefon: string | null; epost: string | null; sted: string | null; notat: string | null }[]
  >([]);

  const lastNavn = useCallback(async (navn: string, fodselsaar: string | null) => {
    setLaster(true);
    setTreff([]);
    setNotat("");
    setNotatStatus("");
    setKontakter([]);
    try {
      const r = await fetch(
        `/api/aksjonaer?navn=${encodeURIComponent(navn)}&fodselsaar=${encodeURIComponent(fodselsaar ?? "")}`);
      setDetalj(await r.json());
      const nr = await fetch(
        `/api/notat?navn=${encodeURIComponent(navn)}&fodselsaar=${encodeURIComponent(fodselsaar ?? "")}`);
      setNotat((await nr.json()).notat ?? "");
      const kr = await fetch(`/api/kontakt?navn=${encodeURIComponent(navn)}`);
      setKontakter((await kr.json()).kontakter ?? []);
    } finally {
      setLaster(false);
    }
  }, []);

  // Lagre notat (debounced) for gjeldende person.
  const endreNotat = useCallback((tekst: string, navn: string, fodselsaar: string | null) => {
    setNotat(tekst);
    setNotatStatus("lagrer");
    if (notatTimer.current) clearTimeout(notatTimer.current);
    notatTimer.current = setTimeout(async () => {
      await fetch("/api/notat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ navn, fodselsaar: fodselsaar ?? "", notat: tekst }),
      }).catch(() => {});
      setNotatStatus("lagret");
    }, 600);
  }, []);

  // Søk i egne notater (f.eks. "golf").
  useEffect(() => {
    if (notatSok.trim().length < 2) { setNotatTreff([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/notat?sok=${encodeURIComponent(notatSok.trim())}`);
      setNotatTreff((await r.json()).treff ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [notatSok]);

  // Åpne direkte fra et bokmerke (?navn=&fodselsaar=).
  useEffect(() => {
    if (initialNavn) lastNavn(initialNavn, initialFodselsaar ?? "");
  }, [initialNavn, initialFodselsaar, lastNavn]);

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

  // Sammendrag for personen: antall selskaper, estimert porteføljeverdi (siste
  // kjente verdi der børskurs finnes), aktive styreverv og siste skatteår.
  const sammendrag = useMemo(() => {
    let verdi = 0;
    let harVerdi = false;
    for (const s of selskaper) {
      for (let i = aar.length - 1; i >= 0; i--) {
        const c = celle.get(`${s.orgnr}|${aar[i]}`);
        if (c != null) {
          if (c.verdi) { verdi += Number(c.verdi); harVerdi = true; }
          break;
        }
      }
    }
    const roller = detalj?.roller ?? [];
    const aktiveVerv = roller.filter((r) => !r.fratraadt).length;
    const skatt = detalj?.skatt ?? [];
    const sisteSkatt = skatt.length ? skatt[skatt.length - 1] : null;
    return {
      antallSelskaper: selskaper.length,
      verdi: harVerdi ? verdi : null,
      aktiveVerv,
      antallVerv: roller.length,
      sisteSkatt,
      periode: aar.length ? `${aar[0]}–${aar[aar.length - 1]}` : null,
    };
  }, [selskaper, aar, celle, detalj]);

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
                  <span>
                    {t.navn}
                    {t.erAksjonaer === false && (
                      <span className="ml-2 text-xs" style={{ color: "var(--accent2)" }}>
                        {t.harRolle ? "styreverv" : "skatteliste"}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-3 whitespace-nowrap" style={{ color: "var(--muted)" }}>
                    {t.sted && <span className="truncate" style={{ maxWidth: "11rem" }}>{t.sted}</span>}
                    <span>{t.fodselsaar ?? "–"}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* CRM: søk i egne notater (f.eks. "golf") */}
      <div className="max-w-xl">
        <input
          value={notatSok}
          onChange={(e) => setNotatSok(e.target.value)}
          placeholder="Søk i mine notater (f.eks. golf)…"
          className="input"
        />
        {notatTreff.length > 0 && (
          <div className="card mt-2 divide-y" style={{ borderColor: "var(--border)" }}>
            {notatTreff.map((t, i) => (
              <button
                key={`${t.navn}|${t.fodselsaar}|${i}`}
                onClick={() => { setNotatSok(""); lastNavn(t.navn, t.fodselsaar || null); }}
                className="block w-full px-4 py-2 text-left hover:opacity-80"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium">
                    {t.navn}
                    {t.kilde === "kontakt" && (
                      <span className="ml-2 text-xs font-normal" style={{ color: "var(--accent)" }}>📇 kontakt</span>
                    )}
                  </span>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>{t.fodselsaar || "–"}</span>
                </div>
                <div className="truncate text-xs" style={{ color: "var(--muted)" }}>{t.notat}</div>
              </button>
            ))}
          </div>
        )}
        {notatSok.trim().length >= 2 && notatTreff.length === 0 && (
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>Ingen notater matcher «{notatSok.trim()}».</p>
        )}
      </div>

      {laster && <p className="text-sm" style={{ color: "var(--muted)" }}>Laster…</p>}

      {detalj && (detalj.perAar.length > 0 || (detalj.skatt && detalj.skatt.length > 0) || (detalj.roller && detalj.roller.length > 0)) && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-2xl font-bold">{detalj.navn}</h2>
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              {detalj.fodselsaar ? `f. ${detalj.fodselsaar}` : ""}
              {aar.length > 0
                ? ` · aktiv ${aar[0]}–${aar[aar.length - 1]}`
                : detalj.roller && detalj.roller.length > 0
                ? " · har styreverv"
                : " · kun i skattelista"}
            </span>
            <BokmerkeKnapp
              b={{
                type: "aksjonaer",
                key: `${detalj.navn}|${detalj.fodselsaar ?? ""}`,
                navn: detalj.navn,
                fodselsaar: detalj.fodselsaar,
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat k="Selskaper eid" v={antall(sammendrag.antallSelskaper)} />
            <Stat
              k="Estimert verdi"
              v={sammendrag.verdi != null ? kroner(sammendrag.verdi, { kompakt: true }) : "–"}
              sub={sammendrag.verdi != null ? "der børskurs finnes" : "ingen børskurs"}
            />
            <Stat
              k="Styreverv"
              v={`${sammendrag.aktiveVerv} aktive`}
              sub={sammendrag.antallVerv > sammendrag.aktiveVerv ? `${sammendrag.antallVerv} totalt` : undefined}
            />
            <Stat
              k="Formue (skatteliste)"
              v={sammendrag.sisteSkatt ? kroner(sammendrag.sisteSkatt.formue, { kompakt: true }) : "–"}
              sub={sammendrag.sisteSkatt ? `${sammendrag.sisteSkatt.aar}` : undefined}
            />
          </div>

          {/* Treff i telefonkontaktene mine */}
          {kontakter.length > 0 && (
            <div className="card p-4" style={{ borderColor: "var(--accent)" }}>
              <h3 className="mb-2 text-sm font-semibold">
                📇 I kontaktene dine
                {kontakter.length > 1 && (
                  <span className="ml-2 font-normal" style={{ color: "var(--muted)" }}>({kontakter.length} mulige treff)</span>
                )}
              </h3>
              <div className="space-y-2">
                {kontakter.map((k, i) => (
                  <div key={i} className="text-sm">
                    <div className="font-medium">{k.navn}</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5" style={{ color: "var(--muted)" }}>
                      {k.telefon && (
                        <a href={`tel:${k.telefon.replace(/\s/g, "")}`} className="hover:underline" style={{ color: "var(--accent)" }}>
                          📞 {k.telefon}
                        </a>
                      )}
                      {k.epost && (
                        <a href={`mailto:${k.epost}`} className="hover:underline" style={{ color: "var(--accent)" }}>
                          ✉ {k.epost}
                        </a>
                      )}
                      {k.sted && <span>📍 {k.sted}</span>}
                    </div>
                    {k.notat && <div className="text-xs" style={{ color: "var(--muted)" }}>{k.notat}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mine notater (CRM) */}
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Mine notater</h3>
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                {notatStatus === "lagrer" ? "Lagrer…" : notatStatus === "lagret" ? "Lagret ✓" : ""}
              </span>
            </div>
            <textarea
              value={notat}
              onChange={(e) => endreNotat(e.target.value, detalj.navn, detalj.fodselsaar)}
              placeholder="Egne observasjoner, research, stikkord (f.eks. «golf», «kjenner X», «vurderer kjøp»)… Søkbart øverst."
              rows={3}
              className="input"
              style={{ resize: "vertical", minHeight: "4.5rem" }}
            />
          </div>

          {detalj.roller && detalj.roller.length > 0 && (
            <div className="card overflow-x-auto">
              <h3 className="px-4 pt-4 text-sm font-semibold">
                Styreverv og roller{" "}
                <span style={{ color: "var(--muted)" }}>(selskap, rolle og når det sist ble registrert)</span>
              </h3>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="text-left" style={{ color: "var(--muted)" }}>
                    <th className="px-4 py-2 font-medium">Selskap</th>
                    <th className="px-4 py-2 font-medium">Rolle</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 text-right font-medium">Sist endret</th>
                  </tr>
                </thead>
                <tbody>
                  {detalj.roller.map((r, i) => (
                    <tr key={`${r.orgnr}|${r.rolletype_kode}|${i}`} className="border-t" style={{ borderColor: "var(--border)" }}>
                      <td className="px-4 py-2 font-medium">
                        <Link href={`/selskaper?orgnr=${r.orgnr}`} className="hover:underline">
                          {r.selskap ?? r.orgnr}
                        </Link>
                      </td>
                      <td className="px-4 py-2">{r.rolletype_beskrivelse}</td>
                      <td className="px-4 py-2">
                        {r.fratraadt ? (
                          <span style={{ color: "var(--muted)" }}>Fratrådt</span>
                        ) : (
                          <span style={{ color: "var(--accent)" }}>Aktiv</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right tabnum" style={{ color: "var(--muted)" }}>
                        {dato(r.sist_endret)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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

          {detalj.perAar.length > 0 && (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="card p-3">
      <div className="text-xs" style={{ color: "var(--muted)" }}>{k}</div>
      <div className="mt-0.5 text-lg font-semibold">{v}</div>
      {sub && <div className="text-xs" style={{ color: "var(--muted)" }}>{sub}</div>}
    </div>
  );
}
