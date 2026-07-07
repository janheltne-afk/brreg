import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

// Konkursanalyse i to lag:
//  - OFFISIELL statistikk fra SSB tabell 12972 (ssb_konkurser_kommune/_naering):
//    komplette tall per kommune/næring/år fra 2009 og fremover.
//  - LIVE selskapsliste fra brreg.v_konkurser (enhetsregisteret): kun pågående
//    konkursbo — ferdigbehandlede bo slettes fra Enhetsregisteret, så denne
//    listen er ikke historisk komplett (se tools/load-konkurser.py).
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const aarParam = (sp.get("aar") ?? "").trim();
  const naering = (sp.get("naering") ?? "").trim();

  try {
    // Årsserie for hele landet ('0N'). Tom => SSB-data er ikke lastet ennå.
    const aarListe = await sql<{ aar: number; antall: string }[]>`
      select aar, konkurser as antall from brreg.ssb_konkurser_kommune
      where region_kode = '0N' order by aar`;

    const harSsb = aarListe.length > 0;
    const sisteAar = harSsb ? aarListe[aarListe.length - 1].aar : null;
    const valgtAar = /^\d{4}$/.test(aarParam) ? Number(aarParam) : sisteAar;

    const kommuner = harSsb && valgtAar != null
      ? await sql<{ kode: string; navn: string; antall: string }[]>`
          select region_kode as kode, split_part(region, ' - ', 1) as navn, konkurser as antall
          from brreg.ssb_konkurser_kommune
          where aar = ${valgtAar} and length(region_kode) = 4 and konkurser > 0
          order by konkurser desc, navn`
      : [];

    // Næringer: 2-sifrede NACE-avdelinger (matcher naeringskode1-prefiks).
    const naeringer = harSsb && valgtAar != null
      ? await sql<{ kode: string; navn: string; antall: string }[]>`
          select naering_kode as kode, naering as navn, konkurser as antall
          from brreg.ssb_konkurser_naering
          where aar = ${valgtAar} and naering_kode ~ '^[0-9]{2}$' and konkurser > 0
          order by konkurser desc, navn`
      : [];

    const naeringTrend = naering
      ? await sql<{ aar: number; antall: string }[]>`
          select aar, konkurser as antall from brreg.ssb_konkurser_naering
          where naering_kode = ${naering} order by aar`
      : [];

    // Live-tall fra enhetsregisteret (pågående bo).
    const [live] = await sql<{ paagaaende: string; med_dato: string }[]>`
      select count(*) as paagaaende, count(konkursdato) as med_dato
      from brreg.v_konkurser`;

    return NextResponse.json({
      harSsb,
      aarListe,
      sisteAar,
      valgtAar,
      kommuner,
      naeringer,
      naeringTrend,
      paagaaende: live?.paagaaende ?? "0",
      paagaaendeMedDato: live?.med_dato ?? "0",
    });
  } catch {
    return NextResponse.json({
      harSsb: false, aarListe: [], sisteAar: null, valgtAar: null,
      kommuner: [], naeringer: [], naeringTrend: [],
      paagaaende: "0", paagaaendeMedDato: "0",
    });
  }
}
