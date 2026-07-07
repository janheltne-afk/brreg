import { ErpSok } from "@/components/ErpSok";

export default function ErpPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">ERP-system</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Velg et ERP-system for å se hvilke selskaper som bruker det. Klikk på et selskap for full info.
        </p>
      </div>
      <ErpSok />
    </div>
  );
}
