import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

// Personer i en kommune fra skattelistene (siste år), sortert på formue/inntekt/skatt.
function orderByFor(key: string) {
  switch (key) {
    case "inntekt": return sql`inntekt`;
    case "skatt": return sql`skatt`;
    default: return sql`formue`;
  }
}

export async function GET(req: NextRequest) {
  const kommune = (req.nextUrl.searchParams.get("kommune") ?? "").trim().toUpperCase();
  const sortKey = req.nextUrl.searchParams.get("sort") ?? "formue";
  if (!kommune) return NextResponse.json({ rader: [], aar: null });

  const orderBy = orderByFor(sortKey);

  try {
    const rader = await sql<
      { navn: string; fodselsaar: number; aar: number; inntekt: string; formue: string; skatt: string; rang: number }[]
    >`
      select navn, fodselsaar, aar, inntekt, formue, skatt, rang
      from brreg.skatteliste
      where upper(kommune) = ${kommune}
        and aar = (select max(aar) from brreg.skatteliste where upper(kommune) = ${kommune})
      order by ${orderBy} desc nulls last
      limit 100`;
    const aar = rader.length ? rader[0].aar : null;
    return NextResponse.json({ rader, aar });
  } catch {
    return NextResponse.json({ rader: [], aar: null });
  }
}
