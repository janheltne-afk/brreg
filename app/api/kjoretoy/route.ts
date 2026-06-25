import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

// Kjøretøybestand etter merke (SSB 07832, nasjonalt) + drivstoff-fordeling og
// tall per region/kommune (SSB 07849). Merke-lista er nasjonal; drivstoff følger
// valgt region.
export async function GET(req: NextRequest) {
  const gruppe = (req.nextUrl.searchParams.get("gruppe") ?? "Personbiler").trim();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toUpperCase();
  const region = (req.nextUrl.searchParams.get("region") ?? "0").trim();

  try {
    const [{ aar }] = await sql<{ aar: number }[]>`
      select max(aar) as aar from brreg.kjoretoy_merke`;

    // Merke-fordeling for valgt region (kommune/fylke/land), ikke bare nasjonalt.
    const merker = await sql<{ merke: string; antall: string }[]>`
      select merke, antall
      from brreg.kjoretoy_merke
      where region_kode = ${region} and gruppe = ${gruppe} and aar = ${aar}
        ${q ? sql`and merke like ${"%" + q + "%"}` : sql``}
      order by antall desc
      limit 300`;

    const [{ totalt, antall_merker }] = await sql<{ totalt: string; antall_merker: number }[]>`
      select coalesce(sum(antall),0) as totalt, count(*)::int as antall_merker
      from brreg.kjoretoy_merke where region_kode = ${region} and gruppe = ${gruppe} and aar = ${aar}`;

    const grupper = await sql<{ gruppe: string }[]>`
      select distinct gruppe from brreg.kjoretoy_merke order by gruppe`;

    // Drivstoff-fordeling for valgt region + gruppe.
    const drivstoff = await sql<{ drivstoff: string; antall: string }[]>`
      select drivstoff, antall
      from brreg.kjoretoy_drivstoff
      where region_kode = ${region} and gruppe = ${gruppe} and antall > 0
      order by antall desc`;

    const [{ navn: regionNavn, total: regionTotal }] = (await sql<{ navn: string | null; total: string }[]>`
      select max(region) as navn, coalesce(sum(antall),0) as total
      from brreg.kjoretoy_drivstoff
      where region_kode = ${region} and gruppe = ${gruppe}`) ?? [{ navn: null, total: "0" }];

    // Kommuner til nedtrekksliste (firesifret region-kode).
    const kommuner = await sql<{ kode: string; navn: string }[]>`
      select distinct region_kode as kode, region as navn
      from brreg.kjoretoy_drivstoff
      where length(region_kode) = 4
      order by region`;

    return NextResponse.json({
      aar,
      gruppe,
      grupper: grupper.map((g) => g.gruppe),
      totalt,
      antallMerker: antall_merker,
      merker,
      region,
      regionNavn: region === "0" ? "Hele landet" : regionNavn,
      regionTotal,
      drivstoff,
      kommuner,
    });
  } catch {
    return NextResponse.json({
      aar: null, gruppe, grupper: [], totalt: "0", antallMerker: 0, merker: [],
      region, regionNavn: null, regionTotal: "0", drivstoff: [], kommuner: [],
    });
  }
}
