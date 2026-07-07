import { sql } from "@/lib/db";
import { byggProsessTre, type FpBransjeDetalj, type FpProsessRad } from "@/lib/forretningsprosesser";

type BransjeRad = {
  id: string;
  slug: string;
  navn: string;
  kortnavn: string | null;
  beskrivelse: string;
  ikon: string | null;
};

type NaeringskodeRad = { kode_prefix: string; beskrivelse: string };

type ProsessSqlRad = {
  id: string;
  slug: string;
  parent_id: string | null;
  level: number;
  sortering: number;
  navn: string;
  kortnavn: string | null;
  beskrivelse: string;
  input: string | null;
  output: string | null;
  roller: string | null;
  kpi: string | null;
  bransje_sortering: number | null;
  relevans: string | null;
};

async function hentDetaljForBransje(bransje: BransjeRad): Promise<FpBransjeDetalj> {
  const naeringskoder = await sql<NaeringskodeRad[]>`
    select kode_prefix, beskrivelse
    from brreg.fp_bransje_naeringskode
    where bransje_id = ${bransje.id}::bigint
    order by sortering, kode_prefix`;

  const prosessRader = await sql<ProsessSqlRad[]>`
    with recursive prosess_tree as (
      select p.id, p.slug, p.parent_id, p.level, p.sortering, p.navn, p.kortnavn,
             p.beskrivelse, p.input, p.output, p.roller, p.kpi,
             bp.sortering as bransje_sortering, bp.relevans
      from brreg.fp_bransje_prosess bp
      join brreg.fp_prosess p on p.id = bp.prosess_id
      where bp.bransje_id = ${bransje.id}::bigint and p.aktiv and p.level = 1
      union all
      select c.id, c.slug, c.parent_id, c.level, c.sortering, c.navn, c.kortnavn,
             c.beskrivelse, c.input, c.output, c.roller, c.kpi,
             pt.bransje_sortering, pt.relevans
      from brreg.fp_prosess c
      join prosess_tree pt on pt.id = c.parent_id
      where c.aktiv
    )
    select id::text, slug, parent_id::text, level::int, sortering, navn, kortnavn,
           beskrivelse, input, output, roller, kpi, bransje_sortering, relevans
    from prosess_tree
    order by bransje_sortering, level, sortering, navn`;

  const prosesser: FpProsessRad[] = prosessRader.map((p) => ({
    id: p.id,
    slug: p.slug,
    parentId: p.parent_id,
    level: p.level,
    sortering: p.sortering,
    navn: p.navn,
    kortnavn: p.kortnavn,
    beskrivelse: p.beskrivelse,
    input: p.input,
    output: p.output,
    roller: p.roller,
    kpi: p.kpi,
    relevans: p.relevans,
    bransjeSortering: p.bransje_sortering,
  }));

  return {
    bransje: {
      slug: bransje.slug,
      navn: bransje.navn,
      kortnavn: bransje.kortnavn,
      beskrivelse: bransje.beskrivelse,
      ikon: bransje.ikon,
    },
    naeringskoder: naeringskoder.map((n) => ({ kodePrefix: n.kode_prefix, beskrivelse: n.beskrivelse })),
    prosesser: byggProsessTre(prosesser),
    source: "database",
  };
}

export async function hentBransjeDetaljBySlug(slug: string): Promise<FpBransjeDetalj | null> {
  const [bransje] = await sql<BransjeRad[]>`
    select id::text, slug, navn, kortnavn, beskrivelse, ikon
    from brreg.fp_bransje
    where slug = ${slug} and aktiv
    limit 1`;
  if (!bransje) return null;
  return hentDetaljForBransje(bransje);
}

// Finner bransjen hvis naeringskode-prefiks matcher enhetens naeringskode1 best
// (lengste prefiks-treff vinner, f.eks. "45.1" foran "45").
export async function hentBransjeForNaeringskode(naeringskode1: string | null | undefined): Promise<FpBransjeDetalj | null> {
  if (!naeringskode1) return null;
  const [match] = await sql<BransjeRad[]>`
    select b.id::text, b.slug, b.navn, b.kortnavn, b.beskrivelse, b.ikon
    from brreg.fp_bransje_naeringskode n
    join brreg.fp_bransje b on b.id = n.bransje_id and b.aktiv
    where ${naeringskode1} like (n.kode_prefix || '%')
    order by length(n.kode_prefix) desc
    limit 1`;
  if (!match) return null;
  return hentDetaljForBransje(match);
}
