import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hentSeedBransjer } from "@/lib/forretningsprosesserSeed";

export const runtime = "nodejs";

type BransjeRad = {
  slug: string;
  navn: string;
  kortnavn: string | null;
  beskrivelse: string;
  ikon: string | null;
  naeringskode_antall: number;
  prosess_antall: number;
};

export async function GET() {
  try {
    const rader = await sql<BransjeRad[]>`
      select b.slug, b.navn, b.kortnavn, b.beskrivelse, b.ikon,
             count(distinct n.id)::int as naeringskode_antall,
             count(distinct bp.prosess_id)::int as prosess_antall
      from brreg.fp_bransje b
      left join brreg.fp_bransje_naeringskode n on n.bransje_id = b.id
      left join brreg.fp_bransje_prosess bp on bp.bransje_id = b.id
      where b.aktiv
      group by b.id, b.slug, b.navn, b.kortnavn, b.beskrivelse, b.ikon, b.sortering
      order by b.sortering, b.navn`;

    if (rader.length === 0) {
      return NextResponse.json({
        bransjer: hentSeedBransjer(),
        source: "seed",
      });
    }

    return NextResponse.json({
      bransjer: rader.map((b) => ({
        slug: b.slug,
        navn: b.navn,
        kortnavn: b.kortnavn,
        beskrivelse: b.beskrivelse,
        ikon: b.ikon,
        naeringskodeAntall: b.naeringskode_antall,
        prosessAntall: b.prosess_antall,
      })),
      source: "database",
    });
  } catch {
    return NextResponse.json({
      bransjer: hentSeedBransjer(),
      source: "seed",
    });
  }
}
