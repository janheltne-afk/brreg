import { Investering } from "@/components/Investering";

export default function InvesteringPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Investerings-screener</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Filtrer på kommune og finn de økonomisk sterkeste selskapene – sortert på resultat,
          omsetning, margin eller egenkapital (siste tilgjengelige årsregnskap).
        </p>
      </div>
      <Investering />
    </div>
  );
}
