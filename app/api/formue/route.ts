import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

// Markedsverdi av en eiers aksjeposter per år (kun børsnoterte med kjent kurs).
export async function GET(req: NextRequest) {
  const navn = (req.nextUrl.searchParams.get("navn") ?? "").trim();
  if (!navn) return NextResponse.json({ error: "navn mangler" }, { status: 400 });

  try {
    const perAar = await sql<{ aar: number; verdi: string; antall_selskaper: number }[]>`
      select aar, sum(verdi)::bigint as verdi, count(distinct orgnr)::int as antall_selskaper
      from brreg.v_eierverdi where aksjonaer_navn = ${navn}
      group by aar order by aar`;

    const sisteAar = perAar.length ? perAar[perAar.length - 1].aar : null;
    const poster = sisteAar
      ? await sql`
          select orgnr, selskap, antall_aksjer, kurs, verdi::bigint as verdi
          from brreg.v_eierverdi
          where aksjonaer_navn = ${navn} and aar = ${sisteAar}
          order by verdi desc nulls last`
      : [];

    return NextResponse.json({ navn, perAar, sisteAar, poster });
  } catch {
    return NextResponse.json({ navn, perAar: [], sisteAar: null, poster: [] });
  }
}
