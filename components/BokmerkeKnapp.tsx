"use client";

import { useBokmerker, type Bokmerke } from "@/lib/bookmarks";

// Hjerte-knapp som lagrer/fjerner et selskap eller en aksjonær som bokmerke.
export function BokmerkeKnapp({ b }: { b: Bokmerke }) {
  const { erBokmerket, veksle } = useBokmerker();
  const aktiv = erBokmerket(b.type, b.key);
  return (
    <button
      onClick={() => veksle(b)}
      className="rounded-lg px-2.5 py-1 text-xs font-medium hover:opacity-80"
      style={{
        border: "1px solid var(--border)",
        color: aktiv ? "var(--accent2)" : "var(--muted)",
      }}
      title={aktiv ? "Fjern fra bokmerker" : "Lagre som bokmerke"}
    >
      {aktiv ? "♥ Lagret" : "♡ Lagre"}
    </button>
  );
}
