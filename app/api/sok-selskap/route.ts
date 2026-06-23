import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ treff: [] });

  const erOrgnr = /^\d{3,}$/.test(q);
  try {
    const treff = erOrgnr
      ? await sql`
          select organisasjonsnummer, navn, organisasjonsform_kode, forr_poststed
          from brreg.enheter
          where organisasjonsnummer like ${q + "%"}
          order by organisasjonsnummer
          limit 15`
      : await sql`
          select organisasjonsnummer, navn, organisasjonsform_kode, forr_poststed
          from brreg.enheter
          where navn ilike ${"%" + q + "%"}
          order by navn
          limit 15`;
    return NextResponse.json({ treff });
  } catch {
    return NextResponse.json({ treff: [] });
  }
}
