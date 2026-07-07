"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  ChevronRight,
  Gauge,
  Users,
  type LucideIcon,
  Warehouse,
  ShoppingBag,
  Fish,
  Factory,
  FlaskConical,
  Wrench,
  HardHat,
  Zap,
  Anchor,
  Truck,
  Cpu,
  Landmark,
  HeartPulse,
  Hotel,
  BriefcaseBusiness,
  Clapperboard,
  Sprout,
} from "lucide-react";
import type { FpBransjeDetalj, FpProsess } from "@/lib/forretningsprosesser";

const IKONER: Record<string, LucideIcon> = {
  Warehouse, ShoppingBag, Fish, Factory, FlaskConical, Wrench, HardHat, Building2,
  Zap, Anchor, Truck, Cpu, Landmark, HeartPulse, Hotel, BriefcaseBusiness, Clapperboard, Sprout,
};

function BransjeIkon({ ikon }: { ikon: string | null }) {
  const Icon = (ikon && IKONER[ikon]) || Building2;
  return (
    <span
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
      style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
    >
      <Icon size={22} strokeWidth={1.75} />
    </span>
  );
}

const RELEVANS_LABEL: Record<string, string> = {
  core: "Kjerneprosess",
  differentiating: "Differensierende",
  support: "Støtteprosess",
};

function relevansFarge(relevans?: string | null) {
  if (relevans === "core") return { fg: "var(--accent)", bg: "var(--accent-soft)" };
  if (relevans === "differentiating") return { fg: "var(--accent2)", bg: "rgba(181,104,11,0.1)" };
  return { fg: "var(--muted)", bg: "var(--bg2)" };
}

function RelevansBadge({ relevans }: { relevans?: string | null }) {
  if (!relevans) return null;
  const { fg, bg } = relevansFarge(relevans);
  return (
    <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: bg, color: fg }}>
      {RELEVANS_LABEL[relevans] ?? relevans}
    </span>
  );
}

type Valg = { root: FpProsess | null; l2: FpProsess | null; l3: FpProsess | null; l4: FpProsess | null };
const TOMT_VALG: Valg = { root: null, l2: null, l3: null, l4: null };

export function ProsessKart({
  detalj,
  tittel,
  onTilbake,
}: {
  detalj: FpBransjeDetalj;
  tittel?: string;
  onTilbake?: () => void;
}) {
  const [valg, setValg] = useState<Valg>(TOMT_VALG);

  const nesteLinjer = useMemo(() => {
    const linjer: { level: number; parent: FpProsess; valgt: FpProsess | null }[] = [];
    if (valg.root && valg.root.children.length > 0) linjer.push({ level: 2, parent: valg.root, valgt: valg.l2 });
    if (valg.l2 && valg.l2.children.length > 0) linjer.push({ level: 3, parent: valg.l2, valgt: valg.l3 });
    if (valg.l3 && valg.l3.children.length > 0) linjer.push({ level: 4, parent: valg.l3, valgt: valg.l4 });
    return linjer;
  }, [valg]);

  const valgtProsess = valg.l4 ?? valg.l3 ?? valg.l2 ?? valg.root;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <BransjeIkon ikon={detalj.bransje.ikon} />
          <div>
            {onTilbake && (
              <button onClick={onTilbake} className="mb-1 text-xs font-medium hover:underline" style={{ color: "var(--accent)" }}>
                ← Tilbake til bransjer
              </button>
            )}
            <h3 className="text-lg font-semibold">{tittel ?? detalj.bransje.navn}</h3>
            <p className="mt-1 max-w-3xl text-sm leading-5" style={{ color: "var(--muted)" }}>
              {detalj.bransje.beskrivelse}
            </p>
          </div>
        </div>
        <div className="flex max-w-xl flex-wrap gap-1.5">
          {detalj.naeringskoder.map((n) => (
            <span
              key={n.kodePrefix}
              title={n.beskrivelse}
              className="rounded-full px-2.5 py-1 text-xs"
              style={{ background: "var(--bg2)", color: "var(--muted)", border: "1px solid var(--border)" }}
            >
              {n.kodePrefix}
            </span>
          ))}
        </div>
      </div>

      {valg.root && (
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          <button onClick={() => setValg(TOMT_VALG)} className="hover:underline" style={{ color: "var(--muted)" }}>
            Alle prosesser
          </button>
          {[valg.root, valg.l2, valg.l3, valg.l4].filter((p): p is FpProsess => p != null).map((p, i, arr) => (
            <span key={p.slug} className="flex items-center gap-1">
              <ChevronRight size={13} style={{ color: "var(--muted2)" }} />
              <button
                onClick={() => {
                  if (i === 0) setValg({ root: p, l2: null, l3: null, l4: null });
                  else if (i === 1) setValg((v) => ({ ...v, l2: p, l3: null, l4: null }));
                  else if (i === 2) setValg((v) => ({ ...v, l3: p, l4: null }));
                }}
                className={i === arr.length - 1 ? "font-semibold" : "hover:underline"}
                style={{ color: i === arr.length - 1 ? "var(--text)" : "var(--muted)" }}
                disabled={i === arr.length - 1}
              >
                {p.navn}
              </button>
            </span>
          ))}
        </nav>
      )}

      <ProcessFlow
        prosesser={detalj.prosesser}
        valgt={valg.root}
        onSelect={(p) => setValg({ root: p, l2: null, l3: null, l4: null })}
      />

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
  );
}

// Level 1-flyten: en sammenhengende prosesskjede (venstre til høyre) i stedet for
// et vanlig rutenett, siden det er slik en verdikjede faktisk leses.
function ProcessFlow({
  prosesser,
  valgt,
  onSelect,
}: {
  prosesser: FpProsess[];
  valgt: FpProsess | null;
  onSelect: (p: FpProsess) => void;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-sm font-semibold">Kjerneprosesser (Level 1)</h4>
        <span className="text-xs" style={{ color: "var(--muted)" }}>{prosesser.length} prosesser</span>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-stretch gap-1.5">
          {prosesser.map((p, i) => {
            const aktiv = valgt?.slug === p.slug;
            const { fg } = relevansFarge(p.relevans);
            return (
              <div key={p.slug} className="flex items-stretch gap-1.5">
                <button
                  onClick={() => onSelect(p)}
                  className="flex min-h-[104px] w-56 flex-col justify-between rounded-lg p-3 text-left transition-colors"
                  style={{
                    border: `1px solid ${aktiv ? "var(--accent)" : "var(--border)"}`,
                    background: aktiv ? "var(--accent-soft)" : "var(--panel)",
                    boxShadow: aktiv ? "var(--shadow)" : "none",
                  }}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: fg }} />
                      <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>{p.kortnavn ?? p.navn}</span>
                    </div>
                    <div className="mt-1.5 text-sm font-semibold leading-5">{p.norskNavn}</div>
                  </div>
                  <div className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
                    {p.children.length > 0 ? `${p.children.length} underprosesser` : "Ingen underprosesser"}
                  </div>
                </button>
                {i < prosesser.length - 1 && (
                  <div className="flex shrink-0 items-center">
                    <ChevronRight size={16} style={{ color: "var(--border-strong)" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
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
    <section className="space-y-2">
      <div>
        <h4 className="text-sm font-semibold">Level {level}</h4>
        <p className="text-xs" style={{ color: "var(--muted)" }}>Under {parent.norskNavn}</p>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-stretch gap-1.5">
          {parent.children.map((p, i) => {
            const aktiv = valgt?.slug === p.slug;
            return (
              <div key={p.slug} className="flex items-stretch gap-1.5">
                <button
                  onClick={() => onSelect(p)}
                  className="min-h-[96px] w-56 rounded-lg p-3 text-left transition-colors"
                  style={{
                    border: `1px solid ${aktiv ? "var(--accent)" : "var(--border)"}`,
                    background: aktiv ? "var(--accent-soft)" : "var(--panel)",
                  }}
                >
                  <div className="text-xs" style={{ color: "var(--muted)" }}>Steg {i + 1}</div>
                  <div className="mt-1 text-sm font-semibold leading-5">{p.navn}</div>
                  <div className="mt-1 text-xs leading-4" style={{ color: "var(--accent)" }}>{p.norskNavn}</div>
                </button>
                {i < parent.children.length - 1 && (
                  <div className="flex shrink-0 items-center">
                    <ChevronRight size={14} style={{ color: "var(--border-strong)" }} />
                  </div>
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
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
            Level {prosess.level}
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h4 className="text-xl font-semibold">{prosess.norskNavn}</h4>
            <span className="text-sm" style={{ color: "var(--muted)" }}>{prosess.navn}</span>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: "var(--muted)" }}>{prosess.beskrivelse}</p>
        </div>
        <RelevansBadge relevans={prosess.relevans} />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DetailBlock icon={ArrowDownToLine} title="Input" value={prosess.input} />
        <DetailBlock icon={ArrowUpFromLine} title="Output" value={prosess.output} />
        <DetailBlock icon={Users} title="Roller" value={prosess.roller} />
        <DetailBlock icon={Gauge} title="KPI-er" value={prosess.kpi} />
      </div>
    </section>
  );
}

function DetailBlock({ icon: Icon, title, value }: { icon: LucideIcon; title: string; value: string | null }) {
  return (
    <div className="border-t pt-3" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        <Icon size={13} />
        {title}
      </div>
      <div className="mt-2 text-sm leading-5">{value || "–"}</div>
    </div>
  );
}
