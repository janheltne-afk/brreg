import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

// Substring-søk på navn (finner også etternavn midt i "FORNAVN ETTERNAVN"),
// mot den dedupliserte søke-tabellen brreg.sok_navn (trigram-indeksert).
// Inkluderer både aksjonærer og skatteliste-personer. Prefiks-treff rangeres først.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 3) return NextResponse.json({ treff: [] });
  const term = q.toUpperCase();

  try {
    const rader = await sql<
      { navn: string; fodselsaar: string | null; er_aksjonaer: boolean }[]
    >`
      select navn, fodselsaar, er_aksjonaer
      from brreg.sok_navn
      where navn like ${"%" + term + "%"}
      order by (navn like ${term + "%"}) desc, navn, fodselsaar
      limit 25`;

    return NextResponse.json({
      treff: rader.map((r) => ({
        navn: r.navn,
        fodselsaar: r.fodselsaar,
        erAksjonaer: r.er_aksjonaer,
      })),
    });
  } catch {
    return NextResponse.json({ treff: [] });
  }
}
