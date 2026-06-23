import { FormueSok } from "@/components/FormueSok";

export default function FormuePage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Formue / aksjeverdi over tid</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Søk opp en eier og se markedsverdien av aksjepostene år for år (antall aksjer × børskurs
          ved første handelsdag). Dekker per nå de største børsnoterte selskapene.
        </p>
      </div>
      <FormueSok />
    </div>
  );
}
