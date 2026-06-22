import { SelskapSok } from "@/components/SelskapSok";

export default async function SelskaperPage({
  searchParams,
}: {
  searchParams: Promise<{ orgnr?: string }>;
}) {
  const { orgnr } = await searchParams;
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Selskaper</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Søk opp et selskap og se enhetsinfo, siste regnskap og aksjeeiere samlet.
        </p>
      </div>
      <SelskapSok initialOrgnr={orgnr} />
    </div>
  );
}
