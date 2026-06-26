import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyToken, COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

async function bruker(req: NextRequest) {
  return verifyToken(req.cookies.get(COOKIE)?.value);
}

// GET ?navn=&fodselsaar=  -> { notat } for én person
// GET ?sok=golf           -> { treff: [{navn, fodselsaar, notat}] } (søk i egne notater)
export async function GET(req: NextRequest) {
  const bn = await bruker(req);
  if (!bn) return NextResponse.json({ notat: "", treff: [] }, { status: 401 });
  const sok = (req.nextUrl.searchParams.get("sok") ?? "").trim();
  try {
    if (sok) {
      // Flere ord = AND: hvert ord må finnes i notatet eller navnet.
      const ord = sok.split(/\s+/).filter(Boolean).slice(0, 8);
      let cond = sql`brukernavn = ${bn}`;
      for (const o of ord) {
        const m = "%" + o + "%";
        cond = sql`${cond} and (notat ilike ${m} or person_navn ilike ${m})`;
      }
      const treff = await sql<{ navn: string; fodselsaar: string; notat: string }[]>`
        select person_navn as navn, person_fodselsaar as fodselsaar, notat
        from brreg.app_notat
        where ${cond}
        order by oppdatert desc limit 100`;
      return NextResponse.json({ treff });
    }
    const navn = (req.nextUrl.searchParams.get("navn") ?? "").trim();
    const fodselsaar = (req.nextUrl.searchParams.get("fodselsaar") ?? "").trim();
    const [rad] = await sql<{ notat: string }[]>`
      select notat from brreg.app_notat
      where brukernavn = ${bn} and person_navn = ${navn} and person_fodselsaar = ${fodselsaar}`;
    return NextResponse.json({ notat: rad?.notat ?? "" });
  } catch {
    return NextResponse.json({ notat: "", treff: [] });
  }
}

// POST { navn, fodselsaar, notat } -> lagrer (eller sletter hvis tomt)
export async function POST(req: NextRequest) {
  const bn = await bruker(req);
  if (!bn) return NextResponse.json({ ok: false }, { status: 401 });
  const { navn, fodselsaar, notat } = await req.json().catch(() => ({}));
  if (!navn) return NextResponse.json({ ok: false }, { status: 400 });
  const fa = (fodselsaar ?? "").toString();
  const tekst = (notat ?? "").toString();
  try {
    if (!tekst.trim()) {
      await sql`delete from brreg.app_notat where brukernavn = ${bn} and person_navn = ${navn} and person_fodselsaar = ${fa}`;
    } else {
      await sql`
        insert into brreg.app_notat (brukernavn, person_navn, person_fodselsaar, notat, oppdatert)
        values (${bn}, ${navn}, ${fa}, ${tekst}, now())
        on conflict (brukernavn, person_navn, person_fodselsaar)
        do update set notat = excluded.notat, oppdatert = now()`;
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
