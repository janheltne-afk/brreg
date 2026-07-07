"use client";

import { useEffect, useState } from "react";
import {
  Building2,
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
import { ProsessKart } from "@/components/ProsessKart";
import type { FpBransje, FpBransjeDetalj, FpBransjeListeResponse, FpKatalogKilde } from "@/lib/forretningsprosesser";

const IKONER: Record<string, LucideIcon> = {
  Warehouse, ShoppingBag, Fish, Factory, FlaskConical, Wrench, HardHat, Building2,
  Zap, Anchor, Truck, Cpu, Landmark, HeartPulse, Hotel, BriefcaseBusiness, Clapperboard, Sprout,
};

export function Forretningsprosesser() {
  const [bransjer, setBransjer] = useState<FpBransje[]>([]);
  const [detalj, setDetalj] = useState<FpBransjeDetalj | null>(null);
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

  if (laster && !detalj && bransjer.length === 0) {
    return <p className="text-sm" style={{ color: "var(--muted)" }}>Laster forretningsprosesser…</p>;
  }

  return (
    <div className="space-y-5">
      {feil && (
        <div className="card p-4 text-sm" style={{ color: "var(--neg)" }}>{feil}</div>
      )}

      {kilde === "seed" && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ border: "1px solid var(--border)", background: "var(--bg2)", color: "var(--muted)" }}>
          Viser seedet kataloginnhold fordi databaseinnholdet for forretningsprosesser ikke er tilgjengelig ennå.
        </div>
      )}

      {!detalj && (
        bransjer.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {bransjer.map((b) => {
              const Icon = (b.ikon && IKONER[b.ikon]) || Building2;
              return (
                <button key={b.slug} onClick={() => lastBransje(b.slug)} className="card min-h-[148px] p-4 text-left">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                    >
                      <Icon size={22} strokeWidth={1.75} />
                    </span>
                    <span className="rounded-full px-2 py-1 text-xs" style={{ border: "1px solid var(--border)", color: "var(--muted)" }}>
                      {b.prosessAntall ?? 0} L1
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold">{b.navn}</h3>
                  <p className="mt-2 text-sm leading-5" style={{ color: "var(--muted)" }}>{b.beskrivelse}</p>
                  <div className="mt-3 text-xs" style={{ color: "var(--accent)" }}>
                    {b.naeringskodeAntall ?? 0} næringskode-prefikser
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="card p-5 text-sm" style={{ color: "var(--muted)" }}>
            Ingen bransjer er tilgjengelige i katalogen akkurat nå.
          </div>
        )
      )}

      {detalj && (
        <ProsessKart
          detalj={detalj}
          onTilbake={() => setDetalj(null)}
        />
      )}
    </div>
  );
}
