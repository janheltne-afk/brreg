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
    const toppEiere = sisteAar
      ? await sql`
          select aksjonaer_navn, fodselsaar_orgnr, postnr_sted, aksjeklasse, antall_aksjer
          from brreg.aksjonaerer
          where orgnr = ${orgnr} and aar = ${sisteAar}
          order by antall_aksjer desc nulls last limit 20`
      : [];

    return NextResponse.json({ enhet: enhet ?? null, regnskap: regnskap ?? null, perAar, sisteAar, toppEiere });
  } catch {
    return NextResponse.json({ enhet: null, regnskap: null, perAar: [], sisteAar: null, toppEiere: [] });
  }
}
