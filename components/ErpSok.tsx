"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { antall } from "@/lib/format";

type System = { erp_system: string; antall: string };
type Selskap = {
  organisasjonsnummer: string;
  navn: string | null;
  forr_poststed: string | null;
  erp_scope: string | null;
  status: string | null;
  notat: string | null;
};

export function ErpSok() {
  const [systemer, setSystemer] = useState<System[] | null>(null);
  const [valgt, setValgt] = useState("");
  const [selskaper, setSelskaper] = useState<Selskap[]>([]);
  const [laster, setLaster] = useState(false);

  useEffect(() => {
    fetch("/api/erp-systemer")
      .then((r) => r.json())
      .then((d) => {
        setSystemer(d.systemer ?? []);
        if (d.systemer?.length) setValgt(d.systemer[0].erp_system);
      });
  }, []);

  useEffect(() => {
    if (!valgt) return;
    setLaster(true);
    fetch(`/api/erp-selskaper?system=${encodeURIComponent(valgt)}`)
      .then((r) => r.json())
      .then((d) => setSelskaper(d.selskaper ?? []))
      .finally(() => setLaster(false));
  }, [valgt]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 text-sm font-semibold">ERP-system</h3>
        {systemer === null && <p className="text-sm" style={{ color: "var(--muted)" }}>Laster…</p>}
        {systemer && systemer.length === 0 && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>Ingen selskaper er registrert med ERP-system ennå.</p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {(systemer ?? []).map((s) => (
            <button
              key={s.erp_system}
              onClick={() => setValgt(s.erp_system)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium"
              style={{
                border: "1px solid var(--border)",
                background: s.erp_system === valgt ? "var(--accent)" : "transparent",
                color: s.erp_system === valgt ? "#fff" : "var(--muted)",
              }}
            >
              {s.erp_system} <span className="opacity-70">({antall(s.antall)})</span>
            </button>
          ))}
        </div>
      </div>

      {valgt && (
        <div className="card overflow-hidden">
          <h3 className="px-4 pt-4 text-sm font-semibold">
            Selskaper · {valgt}
            <span className="ml-2 font-normal" style={{ color: "var(--muted)" }}>
              {antall(selskaper.length)} stk
            </span>
          </h3>
          {laster ? (
            <p className="px-4 py-3 text-sm" style={{ color: "var(--muted)" }}>Laster…</p>
          ) : (
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: "var(--muted)" }}>
                  <th className="px-4 py-2 font-medium">Selskap</th>
                  <th className="px-4 py-2 font-medium">Sted</th>
                  <th className="px-4 py-2 font-medium">Scope</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {selskaper.map((s) => (
                  <tr key={s.organisasjonsnummer} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-4 py-2 font-medium">
                      <Link href={`/selskaper?orgnr=${s.organisasjonsnummer}`} className="hover:underline">
                        {s.navn ?? s.organisasjonsnummer}
                      </Link>
                    </td>
                    <td className="px-4 py-2" style={{ color: "var(--muted)" }}>{s.forr_poststed ?? "–"}</td>
                    <td className="px-4 py-2" style={{ color: "var(--muted)" }}>{s.erp_scope ?? "–"}</td>
                    <td className="px-4 py-2" style={{ color: "var(--muted)" }}>{s.status ?? "–"}</td>
                  </tr>
                ))}
                {selskaper.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-3" style={{ color: "var(--muted)" }}>
                      Ingen selskaper funnet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
