"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { suksesshistorier, type Suksesshistorie } from "@/lib/suksesshistorier";
import { useRangering } from "@/lib/rangering";
import { antall, kroner, dato } from "@/lib/format";

type Dossier = {
  sisteAar: number | null;
  roller: { orgnr: string; selskap: string | null; rolle: string; fratraadt: boolean; sist_endret: string | null }[];
  holdings: { orgnr: string; selskap: string; antall: string; verdi: string | null }[];
  skatt: { aar: number; inntekt: string | null; formue: string | null } | null;
  antallSelskaperVerv: number;
  aktiveVerv: number;
  porteforljeVerdi: number | null;
  metode: {
    holdingSelskaper: number;
    maksGjeldsgrad: number | null;
    antallGiret: number;
    maksEiere: number;
  } | null;
};

export function Suksesshistorier() {
  const [q, setQ] = useState("");
  const [valgt, setValgt] = useState<Suksesshistorie | null>(null);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [laster, setLaster] = useState(false);
  const [sorterRelevans, setSorterRelevans] = useState(false);
  const { rangering, sett } = useRangering();

  const treff = useMemo(() => {
    const t = q.trim().toLowerCase();
    let liste = t
      ? suksesshistorier.filter(
          (p) => p.navn.toLowerCase().includes(t) || p.bransje.toLowerCase().includes(t)
        )
      : suksesshistorier;
    if (sorterRelevans) {
      liste = [...liste].sort((a, b) => (rangering[b.navn] ?? 0) - (rangering[a.navn] ?? 0));
    }
    return liste;
  }, [q, sorterRelevans, rangering]);

  useEffect(() => {
    if (!valgt) {
      setDossier(null);
      return;
    }
    setLaster(true);
    setDossier(null);
    const ctrl = new AbortController();
    fetch(
      `/api/suksesshistorie?navn=${encodeURIComponent(valgt.navn)}&fodselsaar=${valgt.fodselsaar ?? ""}`,
      { signal: ctrl.signal }
    )
      .then((r) => r.json())
      .then(setDossier)
      .catch(() => {})
      .finally(() => setLaster(false));
    return () => ctrl.abort();
  }, [valgt]);

  if (valgt) {
    return (
      <div className="space-y-5">
        <button
          onClick={() => setValgt(null)}
          className="text-sm hover:underline"
          style={{ color: "var(--accent)" }}
        >
          ← Tilbake til alle
        </button>

        <div className="card p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-2xl font-bold">{valgt.navn}</h2>
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              {valgt.fodselsaar ? `f. ${valgt.fodselsaar} · ` : ""}{valgt.bransje}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed">{valgt.story}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs" style={{ color: "var(--muted)" }}>Hvor relevant for ditt eget liv?</span>
            <RangerVelger
              verdi={rangering[valgt.navn] ?? null}
              onVelg={(n) => sett(valgt.navn, n)}
            />
          </div>
        </div>

        {/* Nøkkeltall fra databasen */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat k="Selskap med verv" v={dossier ? antall(dossier.antallSelskaperVerv) : "…"} sub={dossier ? `${dossier.aktiveVerv} aktive` : undefined} />
          <Stat k="Direkte aksjeposter" v={dossier ? antall(dossier.holdings.length) : "…"} sub={dossier?.sisteAar ? `${dossier.sisteAar}` : undefined} />
          <Stat k="Estimert verdi" v={dossier?.porteforljeVerdi != null ? kroner(dossier.porteforljeVerdi, { kompakt: true }) : "–"} sub="der børskurs finnes" />
          <Stat k="Formue (skatteliste)" v={dossier?.skatt?.formue ? kroner(dossier.skatt.formue, { kompakt: true }) : "–"} sub={dossier?.skatt ? `${dossier.skatt.aar}` : undefined} />
        </div>

        {dossier && dossier.metode && (dossier.metode.holdingSelskaper > 0 || dossier.metode.maksGjeldsgrad != null || dossier.metode.maksEiere > 0) && (
          <div className="card p-4">
            <h3 className="mb-2 text-sm font-semibold">Metode &amp; struktur <span style={{ color: "var(--muted)" }}>(datadrevne signaler fra registrene)</span></h3>
            <ul className="space-y-2 text-sm">
              {dossier.metode.holdingSelskaper > 0 && (
                <li>
                  <span className="font-medium">Fritaksmetoden / holdingstruktur:</span> eier via{" "}
                  <strong>{dossier.metode.holdingSelskaper}</strong> egne selskap som selv eier aksjer i andre
                  selskap. Det er den klassiske holding-kjeden der gevinst og utbytte mellom selskaper er
                  tilnærmet skattefritt (fritaksmetoden), så kapital kan reinvesteres ubeskattet.
                </li>
              )}
              {dossier.metode.maksGjeldsgrad != null && (
                <li>
                  <span className="font-medium">Giring (lånefinansiering):</span> høyeste gjeldsgrad blant
                  selskapene er <strong>{dossier.metode.maksGjeldsgrad.toLocaleString("nb-NO")}</strong> (gjeld delt
                  på egenkapital).{" "}
                  {dossier.metode.antallGiret > 0
                    ? `${dossier.metode.antallGiret} selskap er tungt belånt (gjeldsgrad > 2) – altså vekst bygd med lån.`
                    : "Relativt lav giring i selskapene."}
                </li>
              )}
              {dossier.metode.maksEiere > 1 && (
                <li>
                  <span className="font-medium">Ekstern kapital / medinvestorer:</span> opptil{" "}
                  <strong>{antall(dossier.metode.maksEiere)}</strong> medeiere i ett av selskapene
                  {dossier.metode.maksEiere > 50
                    ? " – henter inn mange investorer for å finansiere satsingene."
                    : " – i hovedsak tett eierskap."}
                </li>
              )}
            </ul>
            <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
              Dette er observasjoner utledet fra registerdata (eierkjeder, regnskap, antall medeiere), ikke
              bekreftede skatte- eller finansieringsvalg. Faktiske disposisjoner er sjelden offentlig kjent i
              detalj.
            </p>
          </div>
        )}

        {laster && <p className="text-sm" style={{ color: "var(--muted)" }}>Henter selskapsstruktur fra databasen…</p>}

        {dossier && dossier.roller.length > 0 && (
          <div className="card overflow-x-auto">
            <h3 className="px-4 pt-4 text-sm font-semibold">
              Selskapsstruktur – styreverv og roller{" "}
              <span style={{ color: "var(--muted)" }}>(fra Enhetsregisteret)</span>
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
                {dossier.roller.map((r, i) => (
                  <tr key={`${r.orgnr}|${i}`} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-2 font-medium">
                      <Link href={`/selskaper?orgnr=${r.orgnr}`} className="hover:underline">
                        {r.selskap ?? r.orgnr}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{r.rolle}</td>
                    <td className="px-4 py-2">
                      {r.fratraadt ? <span style={{ color: "var(--muted)" }}>Fratrådt</span> : <span style={{ color: "var(--accent)" }}>Aktiv</span>}
                    </td>
                    <td className="px-4 py-2 text-right tabnum" style={{ color: "var(--muted)" }}>{dato(r.sist_endret)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {dossier && dossier.holdings.length > 0 && (
          <div className="card overflow-x-auto">
            <h3 className="px-4 pt-4 text-sm font-semibold">
              Direkte aksjeposter {dossier.sisteAar}{" "}
              <span style={{ color: "var(--muted)" }}>(personlig eierskap i aksjonærregisteret)</span>
            </h3>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: "var(--muted)" }}>
                  <th className="px-4 py-2 font-medium">Selskap</th>
                  <th className="px-4 py-2 text-right font-medium">Antall aksjer</th>
                  <th className="px-4 py-2 text-right font-medium">Verdi</th>
                </tr>
              </thead>
              <tbody>
                {dossier.holdings.map((h, i) => (
                  <tr key={`${h.orgnr}|${i}`} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-2 font-medium">
                      <Link href={`/selskaper?orgnr=${h.orgnr}`} className="hover:underline">{h.selskap}</Link>
                    </td>
                    <td className="px-4 py-2 text-right tabnum">{antall(h.antall)}</td>
                    <td className="px-4 py-2 text-right tabnum font-medium">{h.verdi ? kroner(h.verdi, { kompakt: true }) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {dossier && dossier.roller.length === 0 && dossier.holdings.length === 0 && !laster && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Fant ingen direkte treff i registrene på dette navnet. Formuen holdes ofte via
            holdingselskap, utenlandske strukturer eller under et noe annet registrert navn.
          </p>
        )}

        <Link
          href={`/aksjonarer?navn=${encodeURIComponent(valgt.navn.toUpperCase())}&fodselsaar=${valgt.fodselsaar ?? ""}`}
          className="inline-block text-sm hover:underline"
          style={{ color: "var(--accent)" }}
        >
          Se aksjeposter gjennom årene →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Søk navn eller bransje…"
          className="input max-w-md"
        />
        <button
          onClick={() => setSorterRelevans((s) => !s)}
          className="rounded-lg px-3 py-1.5 text-sm font-medium"
          style={{
            border: "1px solid var(--border)",
            background: sorterRelevans ? "var(--accent)" : "transparent",
            color: sorterRelevans ? "#fff" : "var(--muted)",
          }}
        >
          {sorterRelevans ? "Sortert på relevans ✓" : "Sorter på min relevans"}
        </button>
      </div>
      <div className="space-y-2">
        {treff.map((p) => (
          <div
            key={p.navn}
            className="card flex w-full items-center gap-3 px-4 py-3"
          >
            <button onClick={() => setValgt(p)} className="flex min-w-0 flex-1 items-center gap-4 text-left transition hover:opacity-90">
              <span className="w-8 shrink-0 text-sm tabnum" style={{ color: "var(--muted)" }}>
                {suksesshistorier.indexOf(p) + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold">{p.navn}</span>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    {p.fodselsaar ? `f. ${p.fodselsaar} · ` : ""}{p.bransje}
                  </span>
                </div>
                <p className="truncate text-sm" style={{ color: "var(--muted)" }}>{p.story}</p>
              </div>
            </button>
            <RangerVelger verdi={rangering[p.navn] ?? null} onVelg={(n) => sett(p.navn, n)} />
          </div>
        ))}
      </div>
      {treff.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>Ingen treff.</p>}
    </div>
  );
}

// 1–6 relevans-rangering. Trykk på et tall for å sette, samme tall igjen nuller.
function RangerVelger({ verdi, onVelg }: { verdi: number | null; onVelg: (n: number | null) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1" title="Hvor relevant for ditt eget liv? (1–6)">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <button
          key={n}
          onClick={(e) => {
            e.stopPropagation();
            onVelg(verdi === n ? null : n);
          }}
          className="h-6 w-6 rounded text-xs font-medium"
          style={{
            border: "1px solid var(--border)",
            background: verdi != null && n <= verdi ? "var(--accent)" : "transparent",
            color: verdi != null && n <= verdi ? "#fff" : "var(--muted)",
          }}
        >
          {n}
        </button>
      ))}
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
