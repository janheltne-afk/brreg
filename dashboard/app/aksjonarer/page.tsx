import { AksjonaerSok } from "@/components/AksjonaerSok";

export default function AksjonarerPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Aksjonær gjennom årene</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Søk opp en person eller eier og se aksjepostene deres år for år, på tvers av selskaper.
        </p>
      </div>
      <AksjonaerSok />
    </div>
  );
}
