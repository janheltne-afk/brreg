"use client";

// Personlig relevans-rangering (1–6) per innlogget bruker, lagret server-side
// via /api/rangering. Delt modul-cache så lista holdes i synk.

import { useCallback, useEffect, useState } from "react";

let cache: Record<string, number> | null = null;
let laster: Promise<void> | null = null;
const lyttere = new Set<() => void>();
const varsle = () => lyttere.forEach((l) => l());

async function lastInn() {
  try {
    const r = await fetch("/api/rangering");
    const d = await r.json();
    cache = d.rangering ?? {};
  } catch {
    cache = {};
  }
  varsle();
}

export function useRangering() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const oppdater = () => setTick((t) => t + 1);
    lyttere.add(oppdater);
    if (cache === null && !laster) laster = lastInn().finally(() => { laster = null; });
    return () => { lyttere.delete(oppdater); };
  }, []);

  const rangering = cache ?? {};

  const sett = useCallback((navn: string, verdi: number | null) => {
    const ny = { ...(cache ?? {}) };
    if (verdi == null) delete ny[navn];
    else ny[navn] = verdi;
    cache = ny;
    varsle();
    fetch("/api/rangering", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ navn, verdi }),
    }).catch(() => {});
  }, []);

  return { rangering, sett };
}
