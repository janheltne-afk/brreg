"use client";

// Personlig relevans-rangering (1–6) av suksesshistoriene, lagret i nettleseren
// (localStorage). Ingen innlogging. Endringer kringkastes så listen oppdaterer
// seg umiddelbart.

import { useCallback, useEffect, useState } from "react";

const NOKKEL = "brreg_rangering";
const HENDELSE = "brreg-rangering-endret";

function les(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(NOKKEL) || "{}");
  } catch {
    return {};
  }
}

export function useRangering() {
  const [rangering, setRangering] = useState<Record<string, number>>({});

  useEffect(() => {
    setRangering(les());
    const oppdater = () => setRangering(les());
    window.addEventListener(HENDELSE, oppdater);
    window.addEventListener("storage", oppdater);
    return () => {
      window.removeEventListener(HENDELSE, oppdater);
      window.removeEventListener("storage", oppdater);
    };
  }, []);

  const sett = useCallback((navn: string, verdi: number | null) => {
    const r = les();
    if (verdi == null) delete r[navn];
    else r[navn] = verdi;
    window.localStorage.setItem(NOKKEL, JSON.stringify(r));
    window.dispatchEvent(new Event(HENDELSE));
  }, []);

  return { rangering, sett };
}
