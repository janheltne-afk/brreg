import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

// Live "dossier" for en person: styreverv, direkte aksjeposter (med verdi der
// børskurs finnes) og formue fra skattelista. Matcher på navn (+ fødselsår der
// oppgitt). Eksakt navnematch for å treffe indeksene; med fødselsår som ekstra
// presisjon mot navnesøsken.
export async function GET(req: NextRequest) {
  const navn = (req.nextUrl.searchParams.get("navn") ?? "").trim();
  const fodselsaar = (req.nextUrl.searchParams.get("fodselsaar") ?? "").trim();
  if (!navn) return NextResponse.json({ error: "navn mangler" }, { status: 400 });
  const NAVN = navn.toUpperCase();
  const harAar = /^\d{4}$/.test(fodselsaar);
  // Fleksibel navnematch: fornavn-prefiks + etternavn-suffiks, så vi treffer
  // mellomnavn i registeret ("PETTER STORDALEN" -> "PETTER ANKER STORDALEN").
  // Krever text_pattern_ops-indeks for å være rask.
  const tokens = NAVN.split(/\s+/).filter(Boolean);
  const first = tokens[0] ?? NAVN;
  const last = tokens[tokens.length - 1] ?? NAVN;
  const flex = (kol: ReturnType<typeof sql>) =>
    tokens.length > 1
      ? sql`${kol} like ${first + "%"} and ${kol} like ${"%" + last}`
      : sql`${kol} = ${NAVN}`;

  try {
    // Styreverv – hvilke selskap personen sitter/har sittet i styret/ledelsen i.
    const rolleFilter = harAar
      ? sql`${flex(sql`upper(r.person_navn)`)} and to_char(r.person_fodselsdato, 'YYYY') = ${fodselsaar}`
      : flex(sql`upper(r.person_navn)`);
    const roller = await sql<
      { orgnr: string; selskap: string | null; rolle: string; fratraadt: boolean; sist_endret: string | null }[]
    >`
      select r.organisasjonsnummer as orgnr, coalesce(e.navn, r.enhet_navn) as selskap,
             r.rolletype_beskrivelse as rolle, coalesce(r.fratraadt, false) as fratraadt, r.sist_endret
      from brreg.roller r
      left join brreg.enheter e on e.organisasjonsnummer = r.organisasjonsnummer
      where ${rolleFilter}
      order by coalesce(r.fratraadt, false), r.sist_endret desc nulls last
      limit 100`;

    // Direkte aksjeposter – siste år personen er registrert som eier, med verdi.
    const aksjFilter = harAar
      ? sql`aksjonaer_navn = ${NAVN} and fodselsaar_orgnr = ${fodselsaar}`
      : sql`aksjonaer_navn = ${NAVN}`;
    const [sisteRad] = await sql<{ aar: number }[]>`
      select max(aar) as aar from brreg.aksjonaerer where ${aksjFilter}`;
    const sisteAar = sisteRad?.aar ?? null;
    const holdings = sisteAar
      ? await sql<{ orgnr: string; selskap: string; antall: string; verdi: string | null }[]>`
          select a.orgnr, max(a.selskap) as selskap, sum(a.antall_aksjer)::bigint as antall,
                 case when k.kurs is not null then (sum(a.antall_aksjer) * k.kurs)::numeric end as verdi
          from brreg.aksjonaerer a
          left join brreg.aksjekurs k on k.orgnr = a.orgnr and k.aar = a.aar
          where ${aksjFilter} and a.aar = ${sisteAar}
          group by a.orgnr, k.kurs
          order by sum(a.antall_aksjer) desc nulls last
          limit 50`
      : [];

    // Aksjeposter gjennom årene (selskap × år) – vises direkte på siden.
    const historikk = sisteAar
      ? await sql<{ orgnr: string; selskap: string; aar: number; antall: string; verdi: string | null }[]>`
          select a.orgnr, max(a.selskap) as selskap, a.aar,
                 sum(a.antall_aksjer)::bigint as antall,
                 case when k.kurs is not null then (sum(a.antall_aksjer) * k.kurs)::numeric end as verdi
          from brreg.aksjonaerer a
          left join brreg.aksjekurs k on k.orgnr = a.orgnr and k.aar = a.aar
          where ${aksjFilter}
          group by a.orgnr, a.aar, k.kurs
          order by a.orgnr, a.aar
          limit 4000`
      : [];

    // Formue/inntekt fra skattelista (nyeste år).
    const skatt = harAar
      ? await sql<{ aar: number; inntekt: string | null; formue: string | null }[]>`
          select aar, inntekt, formue from brreg.skatteliste
          where ${flex(sql`navn_upper`)} and fodselsaar = ${Number(fodselsaar)}
          order by aar desc limit 1`
      : await sql<{ aar: number; inntekt: string | null; formue: string | null }[]>`
          select aar, inntekt, formue from brreg.skatteliste
          where ${flex(sql`navn_upper`)} order by aar desc limit 1`;

    // Metode & struktur – datadrevne signaler fra selskapene personen styrer/eier.
    const orgnrs = [...new Set(roller.map((r) => r.orgnr))].slice(0, 60);
    let metode: {
      holdingSelskaper: number; // egne selskap som selv eier aksjer (fritaksmetode-kjede)
      maksGjeldsgrad: number | null; // høyeste giring blant selskapene
      antallGiret: number; // selskap med gjeldsgrad > 2
      maksEiere: number; // flest medeiere i ett av selskapene (ekstern kapital)
    } | null = null;
    if (orgnrs.length > 0) {
      const [giring] = await sql<{ maks: string | null; antall_giret: number }[]>`
        select max(case when sum_egenkapital > 0 then round(sum_gjeld / sum_egenkapital, 1) end) as maks,
               count(*) filter (where sum_egenkapital > 0 and sum_gjeld / sum_egenkapital > 2)::int as antall_giret
        from brreg.regnskap where organisasjonsnummer = any(${orgnrs})`;
      const [holding] = await sql<{ n: number }[]>`
        select count(distinct orgnr)::int as n from brreg.aksjonaerer
        where fodselsaar_orgnr = any(${orgnrs}) and aar = 2025`;
      const [eiere] = await sql<{ maks: number }[]>`
        select coalesce(max(c),0)::int as maks from (
          select orgnr, count(*) as c from brreg.aksjonaerer
          where orgnr = any(${orgnrs}) and aar = 2025 group by orgnr) t`;
      metode = {
        holdingSelskaper: holding?.n ?? 0,
        maksGjeldsgrad: giring?.maks != null ? Number(giring.maks) : null,
        antallGiret: giring?.antall_giret ?? 0,
        maksEiere: eiere?.maks ?? 0,
      };
    }

    const aktiveVerv = roller.filter((r) => !r.fratraadt).length;
    const porteforljeVerdi = holdings.reduce((s, h) => s + (h.verdi ? Number(h.verdi) : 0), 0);

    return NextResponse.json({
      sisteAar,
      roller,
      holdings,
      skatt: skatt[0] ?? null,
      antallSelskaperVerv: new Set(roller.map((r) => r.orgnr)).size,
      aktiveVerv,
      porteforljeVerdi: porteforljeVerdi > 0 ? porteforljeVerdi : null,
      metode,
      historikk,
    });
  } catch {
    return NextResponse.json({ sisteAar: null, roller: [], holdings: [], skatt: null, antallSelskaperVerv: 0, aktiveVerv: 0, porteforljeVerdi: null, metode: null, historikk: [] });
  }
}
