// Norske formateringshjelpere.

const nf = new Intl.NumberFormat("nb-NO");

export function antall(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return "–";
  return nf.format(typeof n === "string" ? Number(n) : n);
}

// Kroner, kompakt (mrd/mill/tusen) for store tall.
export function kroner(
  n: number | string | null | undefined,
  opts: { kompakt?: boolean } = {}
): string {
  if (n === null || n === undefined || n === "") return "–";
  const v = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(v)) return "–";
  if (opts.kompakt) {
    const abs = Math.abs(v);
    if (abs >= 1e9) return `${(v / 1e9).toLocaleString("nb-NO", { maximumFractionDigits: 1 })} mrd`;
    if (abs >= 1e6) return `${(v / 1e6).toLocaleString("nb-NO", { maximumFractionDigits: 1 })} mill`;
    if (abs >= 1e3) return `${(v / 1e3).toLocaleString("nb-NO", { maximumFractionDigits: 0 })} k`;
  }
  return `${nf.format(Math.round(v))} kr`;
}

export function dato(d: string | Date | null | undefined): string {
  if (!d) return "–";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "–";
  return date.toLocaleDateString("nb-NO");
}
