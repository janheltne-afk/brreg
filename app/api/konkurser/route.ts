import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

// Konkursanalyse (bransje/kommune/tidsserie) basert på enhetsregisterets egne
// felt `konkurs`/`konkursdato` (se db/konkurs.sql for hvorfor det ikke er det
// frittstående, tilgangsbegrensede Konkursregisteret).
export async function GET(req: NextRequest) {
  const bransje = (req.nextUrl.searchParams.get("bransje") ?? "").trim();

  try {
    const [{ totalt }] = await sql<{ totalt: string }[]>`
      select count(*) as totalt from brreg.v_konkurser`;

    const bransjer = await sql<{ bransje: string; antall: string }[]>`
      select bransje, antall from brreg.mv_konkurser_bransje
      order by antall desc limit 20`;

    const perAar = await sql<{ aar: number; antall: string }[]>`
      select aar, antall from brreg.mv_konkurser_per_aar order by aar`;

    const kommuner = await sql<{ kommune: string; antall: string }[]>`
      select kommune, antall from brreg.mv_konkurser_kommune
      order by antall desc limit 20`;

    const valgtBransje = bransje || (bransjer[0]?.bransje ?? "");
    const bransjeTrend = valgtBransje
      ? await sql<{ aar: number; antall: string }[]>`
          select aar, antall from brreg.mv_konkurser_bransje_aar
          where bransje = ${valgtBransje} order by aar`
      : [];

    return NextResponse.json({ totalt, bransjer, perAar, kommuner, valgtBransje, bransjeTrend });
  } catch {
    return NextResponse.json({
      totalt: "0", bransjer: [], perAar: [], kommuner: [], valgtBransje: "", bransjeTrend: [],
    });
  }
}
