"use client";

// Bokmerker per innlogget bruker (lagres server-side via /api/bokmerker).
// Delt modul-cache så alle komponenter i appen holdes i synk.

import { useCallback, useEffect, useState } from "react";

export type Bokmerke = {
  type: "selskap" | "aksjonaer";
  key: string;
  navn: string;
  orgnr?: string;
  fodselsaar?: string | null;
};

let cache: Bokmerke[] | null = null;
let laster: Promise<void> | null = null;
const lyttere = new Set<() => void>();
const varsle = () => lyttere.forEach((l) => l());

async function lastInn() {
  try {
    const r = await fetch("/api/bokmerker");
    const d = await r.json();
    cache = d.bokmerker ?? [];
  } catch {
    cache = [];
  }
  varsle();
}

export function useBokmerker() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const oppdater = () => setTick((t) => t + 1);
    lyttere.add(oppdater);
    if (cache === null && !laster) laster = lastInn().finally(() => { laster = null; });
    return () => { lyttere.delete(oppdater); };
  }, []);

  const bokmerker = cache ?? [];

  const veksle = useCallback((b: Bokmerke) => {
    const finnes = (cache ?? []).some((x) => x.type === b.type && x.key === b.key);
    cache = finnes
      ? (cache ?? []).filter((x) => !(x.type === b.type && x.key === b.key))
      : [b, ...(cache ?? [])];
    varsle();
    fetch("/api/bokmerker", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ b, fjern: finnes }),
    }).catch(() => {});
  }, []);

  const fjern = useCallback((type: Bokmerke["type"], key: string) => {
    cache = (cache ?? []).filter((x) => !(x.type === type && x.key === key));
    varsle();
    fetch("/api/bokmerker", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ b: { type, key }, fjern: true }),
    }).catch(() => {});
  }, []);

  const erBokmerket = useCallback(
    (type: Bokmerke["type"], key: string) => (cache ?? []).some((x) => x.type === type && x.key === key),
    // tick-avhengighet via re-render
    [bokmerker]
  );

  return { bokmerker, veksle, fjern, erBokmerket };
}
