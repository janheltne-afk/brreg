"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  FpBransje,
  FpBransjeDetalj,
  FpBransjeListeResponse,
  FpKatalogKilde,
  FpProsess,
} from "@/lib/forretningsprosesser";

type Valg = {
  root: FpProsess | null;
  l2: FpProsess | null;
  l3: FpProsess | null;
  l4: FpProsess | null;
};

const TOMT_VALG: Valg = { root: null, l2: null, l3: null, l4: null };

export function Forretningsprosesser() {
  const [bransjer, setBransjer] = useState<FpBransje[]>([]);
  const [detalj, setDetalj] = useState<FpBransjeDetalj | null>(null);
  const [valg, setValg] = useState<Valg>(TOMT_VALG);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState<string | null>(null);
  const [kilde, setKilde] = useState<FpKatalogKilde | null>(null);

  useEffect(() => {
    let aktiv = true;
    fetch("/api/forretningsprosesser/bransjer")
      .then((r) => r.json())
      .then((d: FpBransjeListeResponse) => {
        if (aktiv) {
          setBransjer(d.bransjer ?? []);
          setKilde(d.source ?? "database");
        }
      })
      .catch(() => {
        if (aktiv) setFeil("Kunne ikke hente bransjer.");
      })
      .finally(() => {
        if (aktiv) setLaster(false);
      });
    return () => {
      aktiv = false;
    };
  }, []);

  async function lastBransje(slug: string) {
    setLaster(true);
    setFeil(null);
    setValg(TOMT_VALG);
    try {
      const r = await fetch(`/api/forretningsprosesser/bransje/${encodeURIComponent(slug)}`);
      if (!r.ok) throw new Error("Kunne ikke hente bransje.");
      const d = (await r.json()) as FpBransjeDetalj;
      setDetalj(d);
      setKilde(d.source ?? "database");
    } catch {
      setFeil("Kunne ikke hente prosesskartet for bransjen.");
    } finally {
      setLaster(false);
    }
  }

  const valgtProsess = valg.l4 ?? valg.l3 ?? valg.l2 ?? valg.root;
  const nesteLinjer = useMemo(() => {
    const linjer: { level: number; parent: FpProsess; valgt: FpProsess | null }[] = [];
    if (valg.root && valg.root.children.length > 0) linjer.push({ level: 2, parent: valg.root, valgt: valg.l2 });
    if (valg.l2 && valg.l2.children.length > 0) linjer.push({ level: 3, parent: valg.l2, valgt: valg.l3 });
    if (valg.l3 && valg.l3.children.length > 0) linjer.push({ level: 4, parent: valg.l3, valgt: valg.l4 });
    return linjer;
  }, [valg]);

  if (laster && !detalj && bransjer.length === 0) {
    return <p className="text-sm" style={{ color: "var(--muted)" }}>Laster forretningsprosesser...</p>;
  }

  return (
    <div className="space-y-5">
      {feil && (
        <div className="card p-4 text-sm" style={{ color: "var(--neg)" }}>
          {feil}
        </div>
      )}

      {kilde === "seed" && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ border: "1px solid var(--border)", background: "rgba(255,255,255,0.035)", color: "var(--muted)" }}>
          Viser seedet kataloginnhold fordi databaseinnholdet for forretningsprosesser ikke er tilgjengelig enna.
        </div>
      )}

      {!detalj && (
        bransjer.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {bransjer.map((b) => (
              <button
                key={b.slug}
                onClick={() => lastBransje(b.slug)}
                className="card min-h-[148px] p-4 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <IndustryBadge label={b.kortnavn ?? b.navn} />
                  <span className="rounded-full px-2 py-1 text-xs" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>
                    {b.prosessAntall ?? 0} L1
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold">{b.navn}</h3>
                <p className="mt-2 text-sm leading-5" style={{ color: "var(--muted)" }}>{b.beskrivelse}</p>
                <div className="mt-3 text-xs" style={{ color: "var(--accent)" }}>
                  {b.naeringskodeAntall ?? 0} naeringskode-prefixer
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="card p-5 text-sm" style={{ color: "var(--muted)" }}>
            Ingen bransjer er tilgjengelige i katalogen akkurat na.
          </div>
        )
      )}

      {detalj && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <button
                onClick={() => {
                  setDetalj(null);
                  setValg(TOMT_VALG);
                }}
                className="mb-2 text-sm hover:underline"
                style={{ color: "var(--accent)" }}
              >
                Tilbake til bransjer
              </button>
              <h3 className="text-xl font-semibold">{detalj.bransje.navn}</h3>
              <p className="mt-1 max-w-3xl text-sm leading-5" style={{ color: "var(--muted)" }}>
                {detalj.bransje.beskrivelse}
              </p>
            </div>
            <div className="flex max-w-xl flex-wrap gap-1.5">
              {detalj.naeringskoder.map((n) => (
                <span
                  key={n.kodePrefix}
                  title={n.beskrivelse}
                  className="rounded-full px-2.5 py-1 text-xs"
                  style={{ background: "rgba(255,255,255,0.04)", color: "var(--muted)", border: "1px solid var(--border)" }}
                >
                  {n.kodePrefix}
                </span>
              ))}
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h4 className="text-sm font-semibold">Level 1 prosesser</h4>
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                {detalj.prosesser.length} prosesser koblet til bransjen
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {detalj.prosesser.map((p) => (
                <ProcessCard
                  key={p.slug}
                  prosess={p}
                  aktiv={valg.root?.slug === p.slug}
                  onClick={() => setValg({ root: p, l2: null, l3: null, l4: null })}
                />
              ))}
            </div>
          </section>

          {nesteLinjer.map((linje) => (
            <ProcessLine
              key={`${linje.level}-${linje.parent.slug}`}
              level={linje.level}
              parent={linje.parent}
              valgt={linje.valgt}
              onSelect={(p) =>
                setValg((v) => {
                  if (linje.level === 2) return { ...v, l2: p, l3: null, l4: null };
                  if (linje.level === 3) return { ...v, l3: p, l4: null };
                  return { ...v, l4: p };
                })
              }
            />
          ))}

          {valgtProsess && <ProsessDetalj prosess={valgtProsess} />}
        </div>
      )}
    </div>
  );
}

function IndustryBadge({ label }: { label: string }) {
  const chars = label
    .split(/[\s/-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold"
      style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))" }}
    >
      {chars || "FP"}
    </span>
  );
}

function ProcessCard({ prosess, aktiv, onClick }: { prosess: FpProsess; aktiv: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="card p-4 text-left"
      style={{
        borderColor: aktiv ? "rgba(91, 140, 255, 0.75)" : "var(--border)",
        background: aktiv ? "rgba(91, 140, 255, 0.12)" : "var(--panel)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase" style={{ color: "var(--accent)" }}>
          Level {prosess.level}
        </span>
        <span className="text-xs" style={{ color: "var(--muted)" }}>
          {prosess.children.length} underprosesser
        </span>
      </div>
      <h5 className="mt-2 text-base font-semibold">{prosess.navn}</h5>
      <p className="mt-2 text-sm leading-5" style={{ color: "var(--muted)" }}>{prosess.beskrivelse}</p>
    </button>
  );
}

function ProcessLine({
  level,
  parent,
  valgt,
  onSelect,
}: {
  level: number;
  parent: FpProsess;
  valgt: FpProsess | null;
  onSelect: (p: FpProsess) => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold">Level {level}</h4>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          {parent.navn}
        </p>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-stretch gap-2">
          {parent.children.map((p, i) => {
            const aktiv = valgt?.slug === p.slug;
            return (
              <div key={p.slug} className="flex items-center gap-2">
                <button
                  onClick={() => onSelect(p)}
                  className="min-h-[92px] w-56 rounded-xl p-3 text-left transition-colors"
                  style={{
                    border: aktiv ? "1px solid rgba(91, 140, 255, 0.85)" : "1px solid var(--border)",
                    background: aktiv ? "rgba(91, 140, 255, 0.14)" : "rgba(255,255,255,0.035)",
                  }}
                >
                  <div className="text-xs" style={{ color: "var(--muted)" }}>Steg {i + 1}</div>
                  <div className="mt-1 text-sm font-semibold leading-5">{p.navn}</div>
                  {p.children.length > 0 && (
                    <div className="mt-2 text-xs" style={{ color: "var(--accent)" }}>
                      {p.children.length} neste
                    </div>
                  )}
                </button>
                {i < parent.children.length - 1 && (
                  <div className="h-px w-8 shrink-0" style={{ background: "var(--border)" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProsessDetalj({ prosess }: { prosess: FpProsess }) {
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase" style={{ color: "var(--accent)" }}>
            Level {prosess.level}
          </div>
          <h4 className="mt-1 text-xl font-semibold">{prosess.navn}</h4>
          <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: "var(--muted)" }}>
            {prosess.beskrivelse}
          </p>
        </div>
        {prosess.relevans && (
          <span className="rounded-full px-2.5 py-1 text-xs capitalize" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>
            {prosess.relevans}
          </span>
        )}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DetailBlock title="Input" value={prosess.input} />
        <DetailBlock title="Output" value={prosess.output} />
        <DetailBlock title="Roller" value={prosess.roller} />
        <DetailBlock title="KPI-er" value={prosess.kpi} />
      </div>
    </section>
  );
}

function DetailBlock({ title, value }: { title: string; value: string | null }) {
  return (
    <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
      <div className="text-xs font-semibold uppercase" style={{ color: "var(--muted)" }}>{title}</div>
      <div className="mt-2 text-sm leading-5">{value || "-"}</div>
    </div>
  );
}
