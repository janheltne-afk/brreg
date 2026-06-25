import { Kjoretoy } from "@/components/Kjoretoy";

export default function KjoretoyPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Kjøretøy i Norge</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Registrerte kjøretøy etter merke og kjøretøygruppe. Kilde: SSB (åpne data). Antall, ikke eiere.
        </p>
      </div>
      <Kjoretoy />
    </div>
  );
}
