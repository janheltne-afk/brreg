import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgnr: string }> }
) {
  const { orgnr } = await params;
  if (!/^\d+$/.test(orgnr)) {
    return NextResponse.json({ error: "Ugyldig orgnr" }, { status: 400 });
  }

  try {
    const [enhet] = await sql`
      select organisasjonsnummer, navn, organisasjonsform_kode, organisasjonsform_beskrivelse,
             naeringskode1_beskrivelse, antall_ansatte, stiftelsesdato, forr_poststed,
             forr_kommune, hjemmeside, konkurs, under_avvikling,
             institusjonell_sektor_beskrivelse
      from brreg.enheter where organisasjonsnummer = ${orgnr}`;

    const [regnskap] = await sql`
      select regnskapsperiode_til, sum_driftsinntekter, driftsresultat, aarsresultat,
             sum_eiendeler, sum_egenkapital, sum_gjeld
      from brreg.regnskap where organisasjonsnummer = ${orgnr}
      order by regnskapsperiode_til desc nulls last limit 1`;

    const perAar = await sql`
      select aar, count(*)::int as antall_eiere, sum(antall_aksjer)::bigint as sum_aksjer
      from brreg.aksjonaerer where orgnr = ${orgnr}
      group by aar order by aar`;

    const sisteAar = perAar.length ? perAar[perAar.length - 1].aar : null;
    // Kurs for selskapet det aktuelle året (hvis børsnotert) -> verdi per eierpost.
    const [kursRad] = sisteAar
      ? await sql<{ kurs: string }[]>`
          select kurs from brreg.aksjekurs where orgnr = ${orgnr} and aar = ${sisteAar}`
      : [];
    const kurs = kursRad?.kurs ?? null;

    const toppEiere = sisteAar
      ? await sql`
          select aksjonaer_navn, fodselsaar_orgnr, postnr_sted, aksjeklasse, antall_aksjer,
                 case when ${kurs}::numeric is not null then (antall_aksjer * ${kurs}::numeric) end as verdi
          from brreg.aksjonaerer
          where orgnr = ${orgnr} and aar = ${sisteAar}
          order by antall_aksjer desc nulls last limit 20`
      : [];

    // Roller (styre, daglig leder m.m.) – kun aktive.
    const roller = await sql<
      { rolletype_kode: string; rolletype_beskrivelse: string; person_navn: string | null; person_fodselsdato: string | null; enhet_navn: string | null }[]
    >`
      select rolletype_kode, rolletype_beskrivelse, person_navn, person_fodselsdato, enhet_navn
      from brreg.roller
      where organisasjonsnummer = ${orgnr} and coalesce(fratraadt, false) = false
      order by case rolletype_kode
        when 'INNH' then 0 when 'DAGL' then 1 when 'LEDE' then 2 when 'NEST' then 3
        when 'MEDL' then 4 when 'VARA' then 5 else 9 end, rekkefolge nulls last`;

    return NextResponse.json({ enhet: enhet ?? null, regnskap: regnskap ?? null, perAar, sisteAar, kurs, toppEiere, roller });
  } catch {
    return NextResponse.json({ enhet: null, regnskap: null, perAar: [], sisteAar: null, toppEiere: [], roller: [] });
  }
}
