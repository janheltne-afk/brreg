import { Forretningsprosesser } from "@/components/Forretningsprosesser";

export default function ForretningsprosesserPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Forretningsprosesser</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Velg bransje og drill ned i prosesskart fra Level 1 til detaljerte underprosesser.
        </p>
      </div>
      <Forretningsprosesser />
    </div>
  );
}
