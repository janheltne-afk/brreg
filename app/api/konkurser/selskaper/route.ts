import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

const LIMIT = 50;

// Drill-down: selskaper med pågående konkursbo (fra enhetsregisteret), filtrert
// på kommunenummer (SSB-kommuneklikk), næringsprefiks (2-siffer NACE), år og
// navnesøk. Merk: dekker kun pågående bo — historikken ligger i SSB-tallene.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const aarParam = (sp.get("aar") ?? "").trim();
  const aar = /^\d{4}$/.test(aarParam) ? Number(aarParam) : null;
  const kommunenr = (sp.get("kommunenr") ?? "").trim();
  const naering = (sp.get("naering") ?? "").trim(); // 2-sifret NACE-prefiks
  const q = (sp.get("q") ?? "").trim();
  const offset = Math.max(0, Math.floor(Number(sp.get("offset") ?? "0")) || 0);

  const aarF = aar != null ? sql`and konkursaar = ${aar}` : sql``;
  const kommuneF = /^\d{4}$/.test(kommunenr) ? sql`and kommunenummer = ${kommunenr}` : sql``;
  const naeringF = /^\d{2}$/.test(naering) ? sql`and bransje_kode like ${naering + "%"}` : sql``;
  const navnF = q ? sql`and navn ilike ${"%" + q + "%"}` : sql``;

  try {
    const selskaper = await sql<
      {
        organisasjonsnummer: string;
        navn: string | null;
        bransje: string | null;
        kommune: string | null;
        konkursdato: string | null;
      }[]
    >`
      select organisasjonsnummer, navn, bransje, kommune, konkursdato
      from brreg.v_konkurser
      where true ${aarF} ${kommuneF} ${naeringF} ${navnF}
      order by konkursdato desc nulls last, navn
      limit ${LIMIT} offset ${offset}`;

    const [{ totalt }] = await sql<{ totalt: string }[]>`
      select count(*) as totalt from brreg.v_konkurser
      where true ${aarF} ${kommuneF} ${naeringF} ${navnF}`;

    return NextResponse.json({ selskaper, totalt, offset, limit: LIMIT });
  } catch {
    return NextResponse.json({ selskaper: [], totalt: "0", offset: 0, limit: LIMIT });
  }
}
