"use client";

import Link from "next/link";
import { useBokmerker } from "@/lib/bookmarks";

export function BokmerkerListe() {
  const { bokmerker, fjern } = useBokmerker();
  const selskap = bokmerker.filter((b) => b.type === "selskap");
  const personer = bokmerker.filter((b) => b.type === "aksjonaer");

  if (bokmerker.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        Ingen bokmerker ennå. Trykk «♡ Lagre» når du har søkt opp et selskap eller en aksjonær, så
        dukker de opp her.
      </p>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div>
        <h3 className="mb-2 text-sm font-semibold">Selskaper ({selskap.length})</h3>
        {selskap.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>Ingen lagrede selskaper.</p>
        ) : (
          <ul className="space-y-1.5">
            {selskap.map((b) => (
              <li
                key={b.key}
                className="card flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <Link href={`/selskaper?orgnr=${b.orgnr}`} className="text-sm font-medium hover:underline">
                  {b.navn}
                  <span className="ml-2 font-normal" style={{ color: "var(--muted)" }}>
                    {b.orgnr}
                  </span>
                </Link>
                <button
                  onClick={() => fjern("selskap", b.key)}
                  className="text-xs hover:opacity-80"
                  style={{ color: "var(--muted)" }}
                  title="Fjern bokmerke"
                >
                  Fjern
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Aksjonærer ({personer.length})</h3>
        {personer.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>Ingen lagrede aksjonærer.</p>
        ) : (
          <ul className="space-y-1.5">
            {personer.map((b) => (
              <li
                key={b.key}
                className="card flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <Link
                  href={`/aksjonarer?navn=${encodeURIComponent(b.navn)}&fodselsaar=${encodeURIComponent(
                    b.fodselsaar ?? ""
                  )}`}
                  className="text-sm font-medium hover:underline"
                >
                  {b.navn}
                  {b.fodselsaar && (
                    <span className="ml-2 font-normal" style={{ color: "var(--muted)" }}>
                      f. {b.fodselsaar}
                    </span>
                  )}
                </Link>
                <button
                  onClick={() => fjern("aksjonaer", b.key)}
                  className="text-xs hover:opacity-80"
                  style={{ color: "var(--muted)" }}
                  title="Fjern bokmerke"
                >
                  Fjern
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
