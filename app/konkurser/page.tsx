import { Konkurser } from "@/components/Konkurser";

export default function KonkurserPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Konkursregisteret</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Analyse av konkurser per bransje, kommune og år.
        </p>
      </div>
      <Konkurser />
    </div>
  );
}
