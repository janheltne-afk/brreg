import { sql } from "@/lib/db";
import { KpiCard } from "@/components/KpiCard";
import { BarChartCard } from "@/components/charts/BarChartCard";
import { LineChartCard } from "@/components/charts/LineChartCard";
import { Melding } from "@/components/Melding";
import { antall, kroner } from "@/lib/format";

export const dynamic = "force-dynamic"; // rendres per forespørsel (queryer DB)

type Kpi = {
  antall_selskaper: number;
  antall_konkurs: number;
  antall_avvikling: number;
  antall_med_regnskap: number;
  antall_aksjeposter: number;
  sum_driftsinntekter: string;
  sum_aarsresultat: string;
};

export default async function OversiktPage() {
  let kpi: Kpi;
  let orgForm: { beskrivelse: string; antall: number }[];
  let naering: { naering: string; antall: number }[];
  let perAar: { aar: number; antall: number }[];

  try {
    [kpi] = await sql<Kpi[]>`select * from brreg.mv_kpi`;
    orgForm = await sql`select beskrivelse, antall from brreg.mv_org_form order by antall desc limit 8`;
    naering = await sql`select naering, antall from brreg.mv_naering order by antall desc limit 12`;
    perAar = await sql`select aar, antall from brreg.dash_aksjeposter_per_aar order by aar`;
  } catch {
    return (
      <Melding
        tittel="Databasen er ikke koblet til ennå"
        tekst="Sett miljøvariabelen DATABASE_URL i Vercel (Settings → Environment Variables) og redeploy, så lastes dashboardet."
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Selskaper" value={antall(kpi.antall_selskaper)} />
        <KpiCard label="Med regnskap" value={antall(kpi.antall_med_regnskap)} />
        <KpiCard label="Aksjeposter" value={antall(kpi.antall_aksjeposter)} sub="2005–2025" />
        <KpiCard label="Konkurs" value={antall(kpi.antall_konkurs)} />
        <KpiCard label="Driftsinntekter" value={kroner(kpi.sum_driftsinntekter, { kompakt: true })} sub="sum siste regnskap" />
        <KpiCard label="Årsresultat" value={kroner(kpi.sum_aarsresultat, { kompakt: true })} sub="sum siste regnskap" />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BarChartCard title="Selskaper per organisasjonsform" data={orgForm} xKey="beskrivelse" yKey="antall" horizontal />
        <BarChartCard title="Største næringer (antall selskaper)" data={naering} xKey="naering" yKey="antall" horizontal />
      </section>

      <section>
        <LineChartCard title="Aksjeposter per år" data={perAar} xKey="aar" yKey="antall" />
      </section>
    </div>
  );
}
