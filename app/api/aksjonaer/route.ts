import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

// Detalj for én eier (navn + evt. fødselsår): aktivitet per år + eierhistorikk.
export async function GET(req: NextRequest) {
  const navn = (req.nextUrl.searchParams.get("navn") ?? "").trim();
  const fodselsaar = (req.nextUrl.searchParams.get("fodselsaar") ?? "").trim();
  if (!navn) return NextResponse.json({ error: "navn mangler" }, { status: 400 });

  // Filtrer på fødselsår når oppgitt – skiller navnesøsken.
  const filter = fodselsaar
    ? sql`aksjonaer_navn = ${navn} and fodselsaar_orgnr = ${fodselsaar}`
    : sql`aksjonaer_navn = ${navn}`;

  try {
    const perAar = await sql<{ aar: number; antall_selskaper: number; sum_aksjer: string }[]>`
      select aar, count(distinct orgnr)::int as antall_selskaper, sum(antall_aksjer)::bigint as sum_aksjer
      from brreg.aksjonaerer where ${filter}
      group by aar order by aar`;

    const historikk = await sql<
      { orgnr: string; selskap: string; aar: number; antall_aksjer: string }[]
    >`
      select orgnr, max(selskap) as selskap, aar, sum(antall_aksjer)::bigint as antall_aksjer
      from brreg.aksjonaerer where ${filter}
      group by orgnr, aar
      order by orgnr, aar
      limit 4000`;

    return NextResponse.json({ navn, fodselsaar, perAar, historikk });
  } catch {
    return NextResponse.json({ navn, fodselsaar, perAar: [], historikk: [] });
  }
}
