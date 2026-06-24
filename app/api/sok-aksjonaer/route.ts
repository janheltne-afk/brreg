import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

// Substring-søk på navn (finner også etternavn midt i "FORNAVN ETTERNAVN"),
// mot den dedupliserte søke-tabellen brreg.sok_navn (trigram-indeksert).
// Inkluderer både aksjonærer og skatteliste-personer. Prefiks-treff rangeres først.
// Sted/kommune slås opp ved spørretid for de 25 treffene (rask indeks-oppslag),
// nyeste kjente poststed fra aksjonærregisteret, med skattelistas kommune som
// fallback for personer som bare står der.
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 3) return NextResponse.json({ treff: [] });
  const term = q.toUpperCase();

  try {
    const rader = await sql<
      { navn: string; fodselsaar: string | null; er_aksjonaer: boolean; har_rolle: boolean }[]
    >`
      select navn, fodselsaar, er_aksjonaer, har_rolle
      from brreg.sok_navn
      where navn like ${"%" + term + "%"}
      order by (navn like ${term + "%"}) desc, navn, fodselsaar
      limit 25`;

    // Slå opp sted for treffene. Bygg (navn, fødselsår)-par.
    const par = rader.map((r) => [r.navn, r.fodselsaar ?? ""]);
    const stedMap = new Map<string, string>();
    if (par.length > 0) {
      // 1) Nyeste poststed fra aksjonærregisteret.
      const aksj = await sql<{ navn: string; fodsel: string; sted: string | null }[]>`
        select distinct on (a.aksjonaer_navn, a.fodselsaar_orgnr)
               a.aksjonaer_navn as navn, coalesce(a.fodselsaar_orgnr, '') as fodsel,
               nullif(trim(regexp_replace(a.postnr_sted, '^[0-9]+\s*', '')), '') as sted
        from brreg.aksjonaerer a
        join (values ${sql(par)}) as p(navn, fodsel)
          on p.navn = a.aksjonaer_navn and p.fodsel = coalesce(a.fodselsaar_orgnr, '')
        order by a.aksjonaer_navn, a.fodselsaar_orgnr, a.aar desc`;
      for (const r of aksj) if (r.sted) stedMap.set(`${r.navn}|${r.fodsel}`, r.sted);

      // 2) Fallback: kommune fra skattelista for de som mangler.
      const utenSted = par.filter(([n, f]) => !stedMap.has(`${n}|${f}`));
      if (utenSted.length > 0) {
        const skatt = await sql<{ navn: string; fodsel: string; kommune: string | null }[]>`
          select distinct on (s.navn_upper, s.fodselsaar)
                 s.navn_upper as navn, s.fodselsaar::text as fodsel, s.kommune
          from brreg.skatteliste s
          join (values ${sql(utenSted)}) as p(navn, fodsel)
            on p.navn = s.navn_upper and p.fodsel = s.fodselsaar::text
          where s.kommune is not null
          order by s.navn_upper, s.fodselsaar, s.aar desc`;
        for (const r of skatt) if (r.kommune) stedMap.set(`${r.navn}|${r.fodsel}`, r.kommune);
      }
    }

    return NextResponse.json({
      treff: rader.map((r) => ({
        navn: r.navn,
        fodselsaar: r.fodselsaar,
        erAksjonaer: r.er_aksjonaer,
        harRolle: r.har_rolle,
        sted: stedMap.get(`${r.navn}|${r.fodselsaar ?? ""}`) ?? null,
      })),
    });
  } catch {
    return NextResponse.json({ treff: [] });
  }
}
