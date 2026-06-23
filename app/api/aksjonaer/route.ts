import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

// Detalj for én eier (navn + evt. fødselsår): aktivitet per år + eierhistorikk.
export async function GET(req: NextRequest) {
  const navn = (req.nextUrl.searchParams.get("navn") ?? "").trim();
  const fodselsaar = (req.nextUrl.searchParams.get("fodselsaar") ?? "").trim();
  if (!navn) return NextResponse.json({ error: "navn mangler" }, { status: 400 });

  // Filtrer på fødselsår når oppgitt – skiller navnesøsken.
  const filter = fodselsaar
    ? sql`aksjonaer_navn = ${navn} and fodselsaar_orgnr = ${fodselsaar}`
    : sql`aksjonaer_navn = ${navn}`;

  try {
    const perAar = await sql<{ aar: number; antall_selskaper: number; sum_aksjer: string }[]>`
      select aar, count(distinct orgnr)::int as antall_selskaper, sum(antall_aksjer)::bigint as sum_aksjer
      from brreg.aksjonaerer where ${filter}
      group by aar order by aar`;

    const historikk = await sql<
      { orgnr: string; selskap: string; aar: number; antall_aksjer: string; verdi: string | null }[]
    >`
      select a.orgnr, max(a.selskap) as selskap, a.aar,
             sum(a.antall_aksjer)::bigint as antall_aksjer,
             case when k.kurs is not null then (sum(a.antall_aksjer) * k.kurs)::numeric end as verdi
      from brreg.aksjonaerer a
      left join brreg.aksjekurs k on k.orgnr = a.orgnr and k.aar = a.aar
      where ${filter}
      group by a.orgnr, a.aar, k.kurs
      order by a.orgnr, a.aar
      limit 4000`;

    // Skatteliste (offentlig): inntekt/formue/skatt per år, koblet på navn + fødselsår.
    const skatt = /^\d{4}$/.test(fodselsaar)
      ? await sql<{ aar: number; inntekt: string; formue: string; skatt: string; kommune: string; rang: number }[]>`
          select aar, inntekt, formue, skatt, kommune, rang
          from brreg.skatteliste
          where navn_upper = ${navn} and fodselsaar = ${Number(fodselsaar)}
          order by aar`
      : [];

    // Styreverv / roller: hvilke selskap personen har verv i, og når det sist ble
    // registrert (sist_endret ≈ hvor lenge vervet har stått). Matcher på navn,
    // og på fødselsår når oppgitt (skiller navnesøsken).
    const rolleFilter = /^\d{4}$/.test(fodselsaar)
      ? sql`upper(r.person_navn) = ${navn} and to_char(r.person_fodselsdato, 'YYYY') = ${fodselsaar}`
      : sql`upper(r.person_navn) = ${navn}`;
    const roller = await sql<
      { orgnr: string; selskap: string | null; rolletype_kode: string; rolletype_beskrivelse: string;
        fratraadt: boolean | null; sist_endret: string | null }[]
    >`
      select r.organisasjonsnummer as orgnr, e.navn as selskap,
             r.rolletype_kode, r.rolletype_beskrivelse,
             coalesce(r.fratraadt, false) as fratraadt, r.sist_endret
      from brreg.roller r
      left join brreg.enheter e on e.organisasjonsnummer = r.organisasjonsnummer
      where ${rolleFilter}
      order by coalesce(r.fratraadt, false), r.sist_endret desc nulls last
      limit 200`;

    return NextResponse.json({ navn, fodselsaar, perAar, historikk, skatt, roller });
  } catch {
    return NextResponse.json({ navn, fodselsaar, perAar: [], historikk: [], skatt: [], roller: [] });
  }
}
