import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

const LIMIT = 50;

// Drill-down: faktiske selskaper bak en konkurs-rangering (bransje/kommune/år),
// med navnesøk og enkel paginering ("last flere").
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const aarParam = (sp.get("aar") ?? "").trim();
  const aar = /^\d{4}$/.test(aarParam) ? Number(aarParam) : null;
  const bransje = (sp.get("bransje") ?? "").trim();
  const kommune = (sp.get("kommune") ?? "").trim();
  const q = (sp.get("q") ?? "").trim();
  const offset = Math.max(0, Math.floor(Number(sp.get("offset") ?? "0")) || 0);

  const aarFiltre = aar != null ? sql`and konkursaar = ${aar}` : sql``;
  const bransjeFiltre = bransje ? sql`and coalesce(bransje, '(ukjent)') = ${bransje}` : sql``;
  const kommuneFiltre = kommune ? sql`and coalesce(kommune, '(ukjent)') = ${kommune}` : sql``;
  const navnFiltre = q ? sql`and navn ilike ${"%" + q + "%"}` : sql``;

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
      where true ${aarFiltre} ${bransjeFiltre} ${kommuneFiltre} ${navnFiltre}
      order by konkursdato desc nulls last, navn
      limit ${LIMIT} offset ${offset}`;

    const [{ totalt }] = await sql<{ totalt: string }[]>`
      select count(*) as totalt from brreg.v_konkurser
      where true ${aarFiltre} ${bransjeFiltre} ${kommuneFiltre} ${navnFiltre}`;

    return NextResponse.json({ selskaper, totalt, offset, limit: LIMIT });
  } catch {
    return NextResponse.json({ selskaper: [], totalt: "0", offset: 0, limit: LIMIT });
  }
}
