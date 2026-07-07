export type FpNaeringskode = {
  kodePrefix: string;
  beskrivelse: string;
};

export type FpBransje = {
  slug: string;
  navn: string;
  kortnavn: string | null;
  beskrivelse: string;
  ikon: string | null;
  naeringskodeAntall?: number;
  prosessAntall?: number;
};

export type FpProsess = {
  id: string;
  slug: string;
  parentId: string | null;
  level: number;
  sortering: number;
  navn: string;
  kortnavn: string | null;
  beskrivelse: string;
  input: string | null;
  output: string | null;
  roller: string | null;
  kpi: string | null;
  relevans?: string | null;
  children: FpProsess[];
};

export type FpKatalogKilde = "database" | "seed";

export type FpBransjeListeResponse = {
  bransjer: FpBransje[];
  source: FpKatalogKilde;
};

export type FpBransjeDetalj = {
  bransje: FpBransje;
  naeringskoder: FpNaeringskode[];
  prosesser: FpProsess[];
  source: FpKatalogKilde;
};

export type FpProsessRad = Omit<FpProsess, "children"> & {
  bransjeSortering?: number | null;
};

export function byggProsessTre(rader: FpProsessRad[]): FpProsess[] {
  const map = new Map<string, FpProsess>();
  for (const rad of rader) {
    map.set(rad.id, { ...rad, children: [] });
  }

  const roots: FpProsess[] = [];
  for (const prosess of map.values()) {
    if (prosess.parentId && map.has(prosess.parentId)) {
      map.get(prosess.parentId)!.children.push(prosess);
    } else {
      roots.push(prosess);
    }
  }

  const bySortering = (a: FpProsess, b: FpProsess) => a.sortering - b.sortering || a.navn.localeCompare(b.navn, "nb");
  const sortDeep = (node: FpProsess) => {
    node.children.sort(bySortering);
    node.children.forEach(sortDeep);
  };
  roots.sort((a, b) => {
    const ar = rader.find((r) => r.id === a.id)?.bransjeSortering ?? a.sortering;
    const br = rader.find((r) => r.id === b.id)?.bransjeSortering ?? b.sortering;
    return ar - br || a.navn.localeCompare(b.navn, "nb");
  });
  roots.forEach(sortDeep);
  return roots;
}
