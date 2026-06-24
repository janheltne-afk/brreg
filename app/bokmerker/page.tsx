import { BokmerkerListe } from "@/components/BokmerkerListe";

export default function BokmerkerPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Bokmerker</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Selskap og aksjonærer du har lagret. Lagres i nettleseren din.
        </p>
      </div>
      <BokmerkerListe />
    </div>
  );
}
