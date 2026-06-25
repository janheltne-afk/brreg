import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

// Kjøretøybestand etter merke (SSB), filtrert på gruppe + nyeste år.
export async function GET(req: NextRequest) {
  const gruppe = (req.nextUrl.searchParams.get("gruppe") ?? "Personbiler").trim();
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toUpperCase();

  try {
    const [{ aar }] = await sql<{ aar: number }[]>`
      select max(aar) as aar from brreg.kjoretoy_bestand`;

    const merker = await sql<{ merke: string; antall: string }[]>`
      select merke, antall
      from brreg.kjoretoy_bestand
      where gruppe = ${gruppe} and aar = ${aar}
        ${q ? sql`and merke like ${"%" + q + "%"}` : sql``}
      order by antall desc
      limit 300`;

    const [{ totalt, antall_merker }] = await sql<{ totalt: string; antall_merker: number }[]>`
      select coalesce(sum(antall),0) as totalt, count(*)::int as antall_merker
      from brreg.kjoretoy_bestand where gruppe = ${gruppe} and aar = ${aar}`;

    const grupper = await sql<{ gruppe: string }[]>`
      select distinct gruppe from brreg.kjoretoy_bestand order by gruppe`;

    return NextResponse.json({
      aar,
      gruppe,
      grupper: grupper.map((g) => g.gruppe),
      totalt,
      antallMerker: antall_merker,
      merker,
    });
  } catch {
    return NextResponse.json({ aar: null, gruppe, grupper: [], totalt: "0", antallMerker: 0, merker: [] });
  }
}
