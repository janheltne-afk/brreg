import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

// Detalj for ett eier-navn: aktivitet per år + full eierhistorikk (selskap × år).
export async function GET(req: NextRequest) {
  const navn = (req.nextUrl.searchParams.get("navn") ?? "").trim();
  if (!navn) return NextResponse.json({ error: "navn mangler" }, { status: 400 });

  try {
    const perAar = await sql<{ aar: number; antall_selskaper: number; sum_aksjer: string }[]>`
      select aar, count(distinct orgnr)::int as antall_selskaper, sum(antall_aksjer)::bigint as sum_aksjer
      from brreg.aksjonaerer where aksjonaer_navn = ${navn}
      group by aar order by aar`;

    // Full historikk: én rad per (selskap, år). Aggregert over aksjeklasser.
    const historikk = await sql<
      { orgnr: string; selskap: string; aar: number; antall_aksjer: string }[]
    >`
      select orgnr, max(selskap) as selskap, aar, sum(antall_aksjer)::bigint as antall_aksjer
      from brreg.aksjonaerer where aksjonaer_navn = ${navn}
      group by orgnr, aar
      order by orgnr, aar
      limit 4000`;

    return NextResponse.json({ navn, perAar, historikk });
  } catch {
    return NextResponse.json({ navn, perAar: [], historikk: [] });
  }
}
