import { Suksesshistorier } from "@/components/Suksesshistorier";

export default function SuksesshistorierPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Suksesshistorier</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          100 norske bygd­ere og investorer. Trykk på en person for historien og en live
          selskapsstruktur hentet fra registrene – styreverv, aksjeposter og formue.
        </p>
      </div>
      <Suksesshistorier />
    </div>
  );
}
