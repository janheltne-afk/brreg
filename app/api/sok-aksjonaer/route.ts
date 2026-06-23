import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

// Distinkte eier-navn på prefiks (bruker text_pattern_ops-indeksen).
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 3) return NextResponse.json({ treff: [] });

  const navn = await sql<{ aksjonaer_navn: string }[]>`
    select distinct aksjonaer_navn
    from brreg.aksjonaerer
    where aksjonaer_navn like ${q.toUpperCase() + "%"}
    order by aksjonaer_navn
    limit 15`;

  return NextResponse.json({ treff: navn.map((n) => n.aksjonaer_navn) });
}
