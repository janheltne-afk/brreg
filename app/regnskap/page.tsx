import { sql } from "@/lib/db";
import { kroner, dato } from "@/lib/format";
import { Melding } from "@/components/Melding";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Rad = {
  organisasjonsnummer: string;
  navn: string | null;
  forr_poststed: string | null;
  regnskapsperiode_til: string | null;
  sum_driftsinntekter: string | null;
  driftsresultat: string | null;
  aarsresultat: string | null;
  sum_egenkapital: string | null;
};

export default async function RegnskapPage() {
  let rader: Rad[];
  try {
    rader = await sql<Rad[]>`
      select organisasjonsnummer, navn, forr_poststed, regnskapsperiode_til,
             sum_driftsinntekter, driftsresultat, aarsresultat, sum_egenkapital
      from brreg.mv_topp_inntekt
      order by sum_driftsinntekter desc
      limit 50`;
  } catch {
    return (
      <Melding
        tittel="Databasen er ikke koblet til ennå"
        tekst="Sett miljøvariabelen DATABASE_URL i Vercel (Settings → Environment Variables) og redeploy."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Størst på driftsinntekter</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Topp 50 selskaper etter omsetning i siste tilgjengelige årsregnskap.
        </p>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: "var(--muted)" }}>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Selskap</th>
              <th className="px-4 py-3 font-medium">Sted</th>
              <th className="px-4 py-3 font-medium">Periode</th>
              <th className="px-4 py-3 text-right font-medium">Driftsinntekter</th>
              <th className="px-4 py-3 text-right font-medium">Driftsresultat</th>
              <th className="px-4 py-3 text-right font-medium">Årsresultat</th>
            </tr>
          </thead>
          <tbody>
            {rader.map((r, i) => (
              <tr key={r.organisasjonsnummer} className="border-t" style={{ borderColor: "var(--border)" }}>
                <td className="px-4 py-2.5" style={{ color: "var(--muted)" }}>{i + 1}</td>
                <td className="px-4 py-2.5 font-medium">
                  <Link href={`/selskaper?orgnr=${r.organisasjonsnummer}`} className="hover:underline">
                    {r.navn ?? r.organisasjonsnummer}
                  </Link>
                </td>
                <td className="px-4 py-2.5" style={{ color: "var(--muted)" }}>{r.forr_poststed ?? "–"}</td>
                <td className="px-4 py-2.5" style={{ color: "var(--muted)" }}>{dato(r.regnskapsperiode_til)}</td>
                <td className="px-4 py-2.5 text-right">{kroner(r.sum_driftsinntekter, { kompakt: true })}</td>
                <td className="px-4 py-2.5 text-right">{kroner(r.driftsresultat, { kompakt: true })}</td>
                <td className="px-4 py-2.5 text-right">{kroner(r.aarsresultat, { kompakt: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
