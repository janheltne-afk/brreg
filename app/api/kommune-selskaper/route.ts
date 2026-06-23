import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

// Selskaper i en kommune med nøkkeltall fra siste regnskap – investerings-screener.
// sql-fragmentene bygges inni handleren (ikke ved import), så `next build` ikke
// trenger DATABASE_URL.
function orderByFor(key: string) {
  switch (key) {
    case "driftsinntekter": return sql`r.sum_driftsinntekter`;
    case "aarsresultat": return sql`r.aarsresultat`;
    case "egenkapital": return sql`r.sum_egenkapital`;
    case "driftsmargin":
      return sql`(case when r.sum_driftsinntekter > 0 then r.driftsresultat / r.sum_driftsinntekter end)`;
    default: return sql`r.driftsresultat`;
  }
}

export async function GET(req: NextRequest) {
  const kommune = (req.nextUrl.searchParams.get("kommune") ?? "").trim();
  const sortKey = req.nextUrl.searchParams.get("sort") ?? "driftsresultat";
  const minInntekt = Number(req.nextUrl.searchParams.get("minInntekt") ?? "0") || 0;
  if (!kommune) return NextResponse.json({ rader: [] });

  const orderBy = orderByFor(sortKey);

  try {
    const rader = await sql`
      select e.organisasjonsnummer, e.navn, e.naeringskode1_beskrivelse as naering,
             e.antall_ansatte, r.regnskapsperiode_til,
             r.sum_driftsinntekter, r.driftsresultat, r.aarsresultat,
             r.sum_egenkapital, r.sum_eiendeler,
             (case when r.sum_driftsinntekter > 0 then round(100 * r.driftsresultat / r.sum_driftsinntekter, 1) end) as driftsmargin,
             (case when r.sum_egenkapital > 0 then round(100 * r.aarsresultat / r.sum_egenkapital, 1) end) as egenkapitalavkastning,
             (case when r.sum_eiendeler > 0 then round(100 * r.sum_egenkapital / r.sum_eiendeler, 1) end) as egenkapitalandel
      from brreg.enheter e
      join brreg.regnskap r on r.organisasjonsnummer = e.organisasjonsnummer
      where e.forr_kommune = ${kommune}
        and coalesce(r.sum_driftsinntekter, 0) >= ${minInntekt}
      order by ${orderBy} desc nulls last
      limit 100`;
    return NextResponse.json({ rader });
  } catch {
    return NextResponse.json({ rader: [] });
  }
}
