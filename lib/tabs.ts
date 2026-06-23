// Sentral fane-konfigurasjon. Legg til en ny fane ved å lage en mappe under
// app/<slug>/page.tsx og legge til en linje her.
export type Tab = {
  slug: string;
  navn: string;
  beskrivelse: string;
};

export const tabs: Tab[] = [
  { slug: "oversikt", navn: "Oversikt", beskrivelse: "Nøkkeltall for hele registeret" },
  { slug: "selskaper", navn: "Selskaper", beskrivelse: "Søk og se enhet, regnskap og aksjonærer samlet" },
  { slug: "aksjonarer", navn: "Aksjonær", beskrivelse: "Følg én persons aksjeposter gjennom flere år" },
  { slug: "formue", navn: "Formue", beskrivelse: "Markedsverdi av en eiers aksjeposter over tid" },
  { slug: "regnskap", navn: "Regnskap", beskrivelse: "Størst på omsetning og resultat" },
];
