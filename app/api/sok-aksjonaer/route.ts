import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

// Distinkte (navn, fødselsår) fra BÅDE aksjonærregisteret og skattelista,
// slik at personer som kun står i skattelista også dukker opp i søk.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 3) return NextResponse.json({ treff: [] });
  const pre = q.toUpperCase() + "%";

  try {
    const rader = await sql<
      { navn: string; fodselsaar: string | null; er_aksjonaer: boolean }[]
    >`
      select navn, fodselsaar, bool_or(er_aksjonaer) as er_aksjonaer
      from (
        select aksjonaer_navn as navn, fodselsaar_orgnr as fodselsaar, true as er_aksjonaer
        from brreg.aksjonaerer where aksjonaer_navn like ${pre}
        union all
        select navn_upper as navn, fodselsaar::text as fodselsaar, false as er_aksjonaer
        from brreg.skatteliste where navn_upper like ${pre}
      ) t
      group by navn, fodselsaar
      order by navn, fodselsaar
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
