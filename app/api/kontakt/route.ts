import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyToken, COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

// Finn kontakt(er) fra brukerens importerte telefonliste som matcher en person
// (på navn). Fleksibel match: fornavn-prefiks + etternavn.
export async function GET(req: NextRequest) {
  const bn = await verifyToken(req.cookies.get(COOKIE)?.value);
  if (!bn) return NextResponse.json({ kontakter: [] }, { status: 401 });
  const navn = (req.nextUrl.searchParams.get("navn") ?? "").trim().toUpperCase();
  if (!navn) return NextResponse.json({ kontakter: [] });

  const tokens = navn.split(/\s+/).filter(Boolean);
  const first = tokens[0] ?? navn;
  const last = tokens[tokens.length - 1] ?? navn;
  const filter =
    tokens.length > 1
      ? sql`(navn_upper = ${navn} or navn_upper like ${navn + " %"}
             or (navn_upper like ${first + "%"} and navn_upper like ${"%" + last}))`
      : sql`(navn_upper = ${navn} or navn_upper like ${navn + " %"})`;

  try {
    const kontakter = await sql<
      { navn: string; telefon: string | null; epost: string | null; sted: string | null; notat: string | null }[]
    >`
      select navn, telefon, epost, sted, notat from brreg.app_kontakt
      where brukernavn = ${bn} and ${filter}
      order by (telefon <> '') desc limit 10`;
    return NextResponse.json({ kontakter });
  } catch {
    return NextResponse.json({ kontakter: [] });
  }
}
