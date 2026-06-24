"use client";

// Bokmerker (lagrede selskap og aksjonærer) i nettleserens localStorage.
// Ingen innlogging nødvendig – lagres per enhet/nettleser. Endringer kringkastes
// med en egen hendelse så alle komponenter i fanen oppdateres umiddelbart.

import { useCallback, useEffect, useState } from "react";

export type Bokmerke = {
  type: "selskap" | "aksjonaer";
  key: string; // unik id: orgnr (selskap) eller "NAVN|fødselsår" (aksjonær)
  navn: string;
  orgnr?: string;
  fodselsaar?: string | null;
};

const NOKKEL = "brreg_bokmerker";
const HENDELSE = "brreg-bokmerker-endret";

function les(): Bokmerke[] {
  if (typeof window === "undefined") return [];
  try {
    const r = window.localStorage.getItem(NOKKEL);
    return r ? (JSON.parse(r) as Bokmerke[]) : [];
  } catch {
    return [];
  }
}

function skriv(liste: Bokmerke[]) {
  window.localStorage.setItem(NOKKEL, JSON.stringify(liste));
  window.dispatchEvent(new Event(HENDELSE));
}

export function useBokmerker() {
  const [bokmerker, setBokmerker] = useState<Bokmerke[]>([]);

  useEffect(() => {
    setBokmerker(les());
    const oppdater = () => setBokmerker(les());
    window.addEventListener(HENDELSE, oppdater);
    window.addEventListener("storage", oppdater); // synk på tvers av faner
    return () => {
      window.removeEventListener(HENDELSE, oppdater);
      window.removeEventListener("storage", oppdater);
    };
  }, []);

  const veksle = useCallback((b: Bokmerke) => {
    const liste = les();
    const finnes = liste.some((x) => x.type === b.type && x.key === b.key);
    skriv(finnes ? liste.filter((x) => !(x.type === b.type && x.key === b.key)) : [b, ...liste]);
  }, []);

  const fjern = useCallback((type: Bokmerke["type"], key: string) => {
    skriv(les().filter((x) => !(x.type === type && x.key === key)));
  }, []);

  const erBokmerket = useCallback(
    (type: Bokmerke["type"], key: string) =>
      bokmerker.some((x) => x.type === type && x.key === key),
    [bokmerker]
  );

  return { bokmerker, veksle, fjern, erBokmerket };
}
