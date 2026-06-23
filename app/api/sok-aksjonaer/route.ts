import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

// Distinkte (navn, fødselsår/orgnr) på prefiks – skiller navnesøsken.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 3) return NextResponse.json({ treff: [] });

  try {
    const rader = await sql<{ aksjonaer_navn: string; fodselsaar_orgnr: string | null }[]>`
      select aksjonaer_navn, fodselsaar_orgnr
      from brreg.aksjonaerer
      where aksjonaer_navn like ${q.toUpperCase() + "%"}
      group by aksjonaer_navn, fodselsaar_orgnr
      order by aksjonaer_navn, fodselsaar_orgnr
      limit 25`;
    return NextResponse.json({
      treff: rader.map((r) => ({ navn: r.aksjonaer_navn, fodselsaar: r.fodselsaar_orgnr })),
    });
  } catch {
    return NextResponse.json({ treff: [] });
  }
}
