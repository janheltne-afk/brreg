export type FpNaeringskode = {
  kodePrefix: string;
  beskrivelse: string;
};

export type FpBransje = {
  slug: string;
  navn: string;
  kortnavn: string | null;
  beskrivelse: string;
  ikon: string | null;
  naeringskodeAntall?: number;
  prosessAntall?: number;
};

export type FpProsess = {
  id: string;
  slug: string;
  parentId: string | null;
  level: number;
  sortering: number;
  navn: string;
  norskNavn: string;
  kortnavn: string | null;
  beskrivelse: string;
  input: string | null;
  output: string | null;
  roller: string | null;
  kpi: string | null;
  relevans?: string | null;
  children: FpProsess[];
};

export type FpKatalogKilde = "database" | "seed";

export type FpBransjeListeResponse = {
  bransjer: FpBransje[];
  source: FpKatalogKilde;
};

export type FpBransjeDetalj = {
  bransje: FpBransje;
  naeringskoder: FpNaeringskode[];
  prosesser: FpProsess[];
  source: FpKatalogKilde;
};

export type FpProsessRad = Omit<FpProsess, "children" | "norskNavn"> & {
  norskNavn?: string | null;
  bransjeSortering?: number | null;
};

const norskeProsessnavn: Record<string, string> = {
  "market-to-lead": "Marked til lead",
  "lead-to-quote": "Lead til tilbud",
  "order-to-cash": "Ordre til betaling",
  "procure-to-pay": "Innkjøp til betaling",
  "forecast-to-plan": "Prognose til plan",
  "plan-to-produce": "Plan til produksjon",
  "inventory-to-deliver": "Lager til levering",
  "service-to-resolution": "Service til løsning",
  "concept-to-launch": "Konsept til lansering",
  "maintain-to-operate": "Vedlikehold til drift",
  "hire-to-retire": "Ansettelse til avslutning",
  "financial-plan-to-report": "Finansiell plan til rapportering",
  "market-insight": "Markedsinnsikt",
  "campaign-planning": "Kampanjeplanlegging",
  "lead-capture": "Leadfangst",
  "lead-qualification": "Leadkvalifisering",
  "opportunity-discovery": "Mulighetsavklaring",
  "solution-design": "Løsningsdesign",
  "pricing-and-approval": "Prising og godkjenning",
  "quote-issue": "Tilbudsutsendelse",
  "order-capture": "Ordremottak",
  "credit-and-availability-check": "Kreditt- og tilgjengelighetssjekk",
  "fulfilment-and-delivery": "Oppfyllelse og levering",
  "billing-and-collection": "Fakturering og innkreving",
  "purchase-requisition": "Innkjøpsrekvisisjon",
  "supplier-selection": "Leverandørvalg",
  "purchase-order": "Innkjøpsordre",
  "receipt-and-invoice-match": "Mottak og fakturamatch",
  "supplier-payment": "Leverandørbetaling",
  "demand-forecasting": "Etterspørselsprognose",
  "capacity-planning": "Kapasitetsplanlegging",
  "supply-planning": "Forsyningsplanlegging",
  "scenario-review": "Scenariogjennomgang",
  "production-planning": "Produksjonsplanlegging",
  "material-staging": "Materialklargjøring",
  "production-execution": "Produksjonsgjennomføring",
  "quality-release": "Kvalitetsfrigivelse",
  "inventory-control": "Lagerstyring",
  "pick-and-pack": "Plukk og pakk",
  "transport-booking": "Transportbooking",
  "delivery-confirmation": "Leveringsbekreftelse",
  "case-intake": "Saksmottak",
  "triage-and-dispatch": "Prioritering og tildeling",
  "resolution-work": "Løsningsarbeid",
  "closure-and-learning": "Avslutning og læring",
  "idea-capture": "Idéinnsamling",
  "business-case": "Forretningscase",
  "development-and-validation": "Utvikling og validering",
  "launch-readiness": "Lanseringsklarhet",
  "asset-register": "Anleggsregister",
  "maintenance-planning": "Vedlikeholdsplanlegging",
  "work-order-execution": "Arbeidsordregjennomføring",
  "reliability-improvement": "Driftssikkerhetsforbedring",
  "workforce-planning": "Bemanningsplanlegging",
  "recruit-and-onboard": "Rekruttering og onboarding",
  "time-payroll-and-performance": "Tid, lønn og prestasjon",
  "offboarding": "Avslutning av arbeidsforhold",
  "budget-and-forecast": "Budsjett og prognose",
  "record-to-ledger": "Bilag til hovedbok",
  "period-close": "Periodeavslutning",
  "management-reporting": "Ledelsesrapportering",
  "receive-customer-order": "Motta kundeordre",
  "validate-order-masterdata": "Validere ordre- og masterdata",
  "confirm-order": "Bekrefte ordre",
  "credit-check": "Kredittsjekk",
  "availability-promise": "Tilgjengelighetsløfte",
  "release-for-fulfilment": "Frigi til oppfyllelse",
  "ship-or-deliver": "Sende eller levere",
  "invoice-customer": "Fakturere kunde",
  "collect-payment": "Kreve inn betaling",
  "reconcile-receivable": "Avstemme kundefordring",
  "identify-purchase-need": "Identifisere innkjøpsbehov",
  "approve-requisition": "Godkjenne rekvisisjon",
  "create-purchase-order": "Opprette innkjøpsordre",
  "send-purchase-order": "Sende innkjøpsordre",
  "receive-goods": "Motta varer",
  "service-entry": "Registrere tjenestemottak",
  "three-way-match": "Treveismatch",
  "payment-run": "Betalingskjøring",
  "supplier-reconciliation": "Leverandøravstemming",
  "create-master-production-schedule": "Lage produksjonsprogram",
  "sequence-production": "Sekvensere produksjon",
  "reserve-materials": "Reservere materialer",
  "stage-materials-to-line": "Klargjøre materialer til linje",
  "release-production-order": "Frigi produksjonsordre",
  "confirm-operations": "Bekrefte operasjoner",
  "capture-production-variance": "Registrere produksjonsavvik",
  "quality-inspection": "Kvalitetskontroll",
  "release-finished-goods": "Frigi ferdigvarer",
  "cycle-counting": "Syklisk telling",
  "replenishment-control": "Påfyllingsstyring",
  "wave-or-pick-release": "Frigi plukkbølge",
  "pack-and-label": "Pakke og merke",
  "select-carrier": "Velge transportør",
  "proof-of-delivery": "Leveringsbevis",
  "collect-budget-input": "Samle budsjettinnspill",
  "consolidate-forecast": "Konsolidere prognose",
  "post-subledger-transactions": "Bokføre subledger-transaksjoner",
  "manual-journal-entry": "Manuelt bilag",
  "subledger-close": "Subledger-avslutning",
  "account-reconciliation": "Kontoavstemming",
  "close-period": "Lukke periode",
  "generate-management-pack": "Lage ledelsespakke",
  "statutory-reporting": "Lovpålagt rapportering",
  "invoice-data-validation": "Validere fakturagrunnlag",
  "invoice-dispatch": "Sende faktura",
  "goods-receipt-registration": "Registrere varemottak",
  "receipt-quality-hold": "Kvalitetssperre ved mottak",
  "print-or-issue-shop-papers": "Utstede produksjonsdokumenter",
  "backflush-materials": "Tilbakeflush av materialer",
  "accounts-payable-close": "Lukke leverandørreskontro",
  "accounts-receivable-close": "Lukke kundereskontro",
  "bank-reconciliation": "Bankavstemming",
  "period-lock": "Periodesperre",
};

export function norskProsessNavn(slug: string, fallback: string): string {
  return norskeProsessnavn[slug] ?? fallback;
}

export function byggProsessTre(rader: FpProsessRad[]): FpProsess[] {
  const map = new Map<string, FpProsess>();
  for (const rad of rader) {
    map.set(rad.id, {
      ...rad,
      norskNavn: rad.norskNavn ?? norskProsessNavn(rad.slug, rad.navn),
      children: [],
    });
  }

  const roots: FpProsess[] = [];
  for (const prosess of map.values()) {
    if (prosess.parentId && map.has(prosess.parentId)) {
      map.get(prosess.parentId)!.children.push(prosess);
    } else {
      roots.push(prosess);
    }
  }

  const bySortering = (a: FpProsess, b: FpProsess) => a.sortering - b.sortering || a.navn.localeCompare(b.navn, "nb");
  const sortDeep = (node: FpProsess) => {
    node.children.sort(bySortering);
    node.children.forEach(sortDeep);
  };
  roots.sort((a, b) => {
    const ar = rader.find((r) => r.id === a.id)?.bransjeSortering ?? a.sortering;
    const br = rader.find((r) => r.id === b.id)?.bransjeSortering ?? b.sortering;
    return ar - br || a.navn.localeCompare(b.navn, "nb");
  });
  roots.forEach(sortDeep);
  return roots;
}
