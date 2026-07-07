import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

// Konkursanalyse (bransje/kommune/tidsserie) basert på enhetsregisterets egne
// felt `konkurs`/`konkursdato` (se db/konkurs.sql for hvorfor det ikke er det
// frittstående, tilgangsbegrensede Konkursregisteret). Spørres live mot
// brreg.v_konkurser (ikke materialiserte views) slik at tallene alltid er
// ferske rett etter en ny enhets-sync, uten manuell REFRESH.
export async function GET(req: NextRequest) {
  const aarParam = (req.nextUrl.searchParams.get("aar") ?? "").trim();
  const aar = /^\d{4}$/.test(aarParam) ? Number(aarParam) : null;
  const bransje = (req.nextUrl.searchParams.get("bransje") ?? "").trim();

  const aarFiltre = aar != null ? sql`and konkursaar = ${aar}` : sql``;

  try {
    const [{ totalt_alle_tid, med_kjent_dato }] = await sql<
      { totalt_alle_tid: string; med_kjent_dato: string }[]
    >`
      select count(*) as totalt_alle_tid, count(konkursdato) as med_kjent_dato
      from brreg.v_konkurser`;

    const aarListe = await sql<{ aar: number; antall: string }[]>`
      select konkursaar as aar, count(*) as antall
      from brreg.v_konkurser
      where konkursaar is not null
      group by 1 order by 1 desc`;

    const [{ totalt }] = await sql<{ totalt: string }[]>`
      select count(*) as totalt from brreg.v_konkurser where true ${aarFiltre}`;

    const bransjer = await sql<{ bransje: string; antall: string }[]>`
      select coalesce(bransje, '(ukjent)') as bransje, count(*) as antall
      from brreg.v_konkurser where true ${aarFiltre}
      group by 1 order by antall desc`;

    const kommuner = await sql<{ kommune: string; antall: string }[]>`
      select coalesce(kommune, '(ukjent)') as kommune, count(*) as antall
      from brreg.v_konkurser where true ${aarFiltre}
      group by 1 order by antall desc`;

    const bransjeTrend = bransje
      ? await sql<{ aar: number; antall: string }[]>`
          select konkursaar as aar, count(*) as antall
          from brreg.v_konkurser
          where konkursaar is not null and coalesce(bransje, '(ukjent)') = ${bransje}
          group by 1 order by 1`
      : [];

    return NextResponse.json({
      totaltAlleTid: totalt_alle_tid,
      medKjentDato: med_kjent_dato,
      aarListe,
      valgtAar: aar,
      totalt,
      bransjer,
      kommuner,
      bransjeTrend,
    });
  } catch {
    return NextResponse.json({
      totaltAlleTid: "0", medKjentDato: "0", aarListe: [], valgtAar: null,
      totalt: "0", bransjer: [], kommuner: [], bransjeTrend: [],
    });
  }
}
