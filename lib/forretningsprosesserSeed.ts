import {
  byggProsessTre,
  type FpBransje,
  type FpBransjeDetalj,
  type FpNaeringskode,
  type FpProsessRad,
} from "@/lib/forretningsprosesser";

type BransjeSeed = FpBransje & { sortering: number };

type BransjeProsessSeed = {
  slug: string;
  sortering: number;
  relevans: string;
};

type ProsessSeed = {
  slug: string;
  parentSlug: string | null;
  level: number;
  sortering: number;
  navn: string;
  kortnavn: string | null;
  beskrivelse: string;
  input: string | null;
  output: string | null;
  roller: string | null;
  kpi: string | null;
};

const bransjerSeed: BransjeSeed[] = [
  { slug: "distribusjon-og-engros", navn: "Distribusjon og engros", kortnavn: "Distribusjon", beskrivelse: "Grossister, importorer og distribusjonsvirksomhet med lager, sortiment, ordre og leveranse som kjerne.", ikon: "Warehouse", sortering: 10 },
  { slug: "retail-og-netthandel", navn: "Retail og netthandel", kortnavn: "Retail", beskrivelse: "Butikk, kjeder og netthandel med vareflyt, kampanjer, kundeopplevelse og marginstyring.", ikon: "ShoppingBag", sortering: 20 },
  { slug: "mat-drikke-og-sjomat", navn: "Mat, drikke og sjomat", kortnavn: "Mat og sjomat", beskrivelse: "Produksjon, foredling og handel med mat, drikke, fiskeri og oppdrett.", ikon: "Fish", sortering: 30 },
  { slug: "industriell-produksjon", navn: "Industriell produksjon", kortnavn: "Industri", beskrivelse: "Diskret og blandet produksjon med planlegging, produksjonsordre, kvalitet og leveranse.", ikon: "Factory", sortering: 40 },
  { slug: "kjemi-og-prosessindustri", navn: "Kjemi og prosessindustri", kortnavn: "Kjemi", beskrivelse: "Prosessindustri med resepter, batch, HMS, sporbarhet og kvalitet som styrende behov.", ikon: "FlaskConical", sortering: 50 },
  { slug: "maskiner-utstyr-og-maritim-teknologi", navn: "Maskiner, utstyr og maritim teknologi", kortnavn: "Utstyr", beskrivelse: "Utstyrsleverandorer, verksted, maritim teknologi og serviceintensive produktlivslop.", ikon: "Wrench", sortering: 60 },
  { slug: "bygg-og-anlegg", navn: "Bygg og anlegg", kortnavn: "Bygg/anlegg", beskrivelse: "Entreprenor, prosjekt, anlegg, tekniske fag og leverandorkjeder rundt bygg og infrastruktur.", ikon: "HardHat", sortering: 70 },
  { slug: "eiendom-og-facility", navn: "Eiendom og facility", kortnavn: "Eiendom", beskrivelse: "Eiendomsutvikling, forvaltning, drift, vedlikehold og facility services.", ikon: "Building2", sortering: 80 },
  { slug: "energi-kraft-og-fornybar", navn: "Energi, kraft og fornybar", kortnavn: "Energi", beskrivelse: "Kraft, nett, fornybar energi og energitjenester med anlegg, marked og drift.", ikon: "Zap", sortering: 90 },
  { slug: "olje-gass-og-offshore-service", navn: "Olje, gass og offshore service", kortnavn: "Offshore", beskrivelse: "Olje, gass, offshore service, subsea og leverandorer til energisektoren.", ikon: "Anchor", sortering: 100 },
  { slug: "transport-logistikk-og-shipping", navn: "Transport, logistikk og shipping", kortnavn: "Logistikk", beskrivelse: "Transport, spedisjon, lager, havn, shipping og mobil ressursutnyttelse.", ikon: "Truck", sortering: 110 },
  { slug: "teknologi-og-it-tjenester", navn: "Teknologi og IT-tjenester", kortnavn: "Teknologi", beskrivelse: "Programvare, IT-drift, konsulenttjenester, plattform, data og digitale produkter.", ikon: "Cpu", sortering: 120 },
  { slug: "finans-forsikring-og-investering", navn: "Finans, forsikring og investering", kortnavn: "Finans", beskrivelse: "Bank, forsikring, kapitalforvaltning, investering og finansiell infrastruktur.", ikon: "Landmark", sortering: 130 },
  { slug: "helse-og-omsorg", navn: "Helse og omsorg", kortnavn: "Helse", beskrivelse: "Helse, omsorg, klinikker, institusjoner og tjenester med pasient-, turnus- og kvalitetsflyt.", ikon: "HeartPulse", sortering: 140 },
  { slug: "reiseliv-hotell-og-servering", navn: "Reiseliv, hotell og servering", kortnavn: "Reiseliv", beskrivelse: "Hotell, servering, reiseliv, opplevelser og kapasitetsbaserte tjenester.", ikon: "Hotel", sortering: 150 },
  { slug: "profesjonelle-tjenester-og-radgivning", navn: "Profesjonelle tjenester og radgivning", kortnavn: "Tjenester", beskrivelse: "Konsulent, juridisk, revisjon, arkitektur, bemanning og kunnskapsbaserte tjenester.", ikon: "BriefcaseBusiness", sortering: 160 },
  { slug: "media-kultur-og-underholdning", navn: "Media, kultur og underholdning", kortnavn: "Media", beskrivelse: "Publisering, produksjon, rettigheter, arrangement, kultur og underholdning.", ikon: "Clapperboard", sortering: 170 },
  { slug: "landbruk-skog-og-naturressurser", navn: "Landbruk, skog og naturressurser", kortnavn: "Naturressurser", beskrivelse: "Landbruk, skogbruk, mineraler og naturressursbasert verdikjede.", ikon: "Sprout", sortering: 180 },
];

const naeringskoderSeed: Record<string, FpNaeringskode[]> = {
  "distribusjon-og-engros": [
    { kodePrefix: "46", beskrivelse: "Agentur- og engroshandel" },
    { kodePrefix: "45.3", beskrivelse: "Handel med deler og utstyr til motorvogner" },
  ],
  "retail-og-netthandel": [
    { kodePrefix: "47", beskrivelse: "Detaljhandel" },
    { kodePrefix: "45.1", beskrivelse: "Handel med motorvogner" },
  ],
  "mat-drikke-og-sjomat": [
    { kodePrefix: "03", beskrivelse: "Fiske, fangst og akvakultur" },
    { kodePrefix: "10", beskrivelse: "Produksjon av naerings- og nytelsesmidler" },
    { kodePrefix: "11", beskrivelse: "Produksjon av drikkevarer" },
  ],
  "industriell-produksjon": [
    { kodePrefix: "13", beskrivelse: "Tekstilproduksjon" },
    { kodePrefix: "16", beskrivelse: "Trelast- og trevareproduksjon" },
    { kodePrefix: "22", beskrivelse: "Gummi- og plastproduksjon" },
    { kodePrefix: "25", beskrivelse: "Metallvareproduksjon" },
    { kodePrefix: "28", beskrivelse: "Maskinproduksjon" },
  ],
  "kjemi-og-prosessindustri": [
    { kodePrefix: "19", beskrivelse: "Petroleums- og kullvareproduksjon" },
    { kodePrefix: "20", beskrivelse: "Kjemisk industri" },
    { kodePrefix: "21", beskrivelse: "Farmasoytisk industri" },
  ],
  "maskiner-utstyr-og-maritim-teknologi": [
    { kodePrefix: "26", beskrivelse: "Data- og elektronikkindustri" },
    { kodePrefix: "27", beskrivelse: "Elektrisk utstyr" },
    { kodePrefix: "30", beskrivelse: "Transportmiddelindustri" },
    { kodePrefix: "33", beskrivelse: "Reparasjon og installasjon av maskiner" },
  ],
  "bygg-og-anlegg": [
    { kodePrefix: "41", beskrivelse: "Oppforing av bygninger" },
    { kodePrefix: "42", beskrivelse: "Anleggsvirksomhet" },
    { kodePrefix: "43", beskrivelse: "Spesialisert bygge- og anleggsvirksomhet" },
  ],
  "eiendom-og-facility": [
    { kodePrefix: "68", beskrivelse: "Omsetning og drift av fast eiendom" },
    { kodePrefix: "81", beskrivelse: "Tjenester tilknyttet eiendomsdrift" },
  ],
  "energi-kraft-og-fornybar": [
    { kodePrefix: "35", beskrivelse: "Elektrisitet, gass, damp og varmtvann" },
    { kodePrefix: "36", beskrivelse: "Vannforsyning" },
  ],
  "olje-gass-og-offshore-service": [
    { kodePrefix: "06", beskrivelse: "Utvinning av raolje og naturgass" },
    { kodePrefix: "09", beskrivelse: "Tjenester tilknyttet bergverksdrift og utvinning" },
  ],
  "transport-logistikk-og-shipping": [
    { kodePrefix: "49", beskrivelse: "Landtransport" },
    { kodePrefix: "50", beskrivelse: "Sjotransport" },
    { kodePrefix: "51", beskrivelse: "Lufttransport" },
    { kodePrefix: "52", beskrivelse: "Lagring og transporttjenester" },
    { kodePrefix: "53", beskrivelse: "Post og distribusjon" },
  ],
  "teknologi-og-it-tjenester": [
    { kodePrefix: "58.2", beskrivelse: "Utgivelse av programvare" },
    { kodePrefix: "62", beskrivelse: "IT-tjenester" },
    { kodePrefix: "63", beskrivelse: "Informasjonstjenester" },
  ],
  "finans-forsikring-og-investering": [
    { kodePrefix: "64", beskrivelse: "Finansieringsvirksomhet" },
    { kodePrefix: "65", beskrivelse: "Forsikring og pensjon" },
    { kodePrefix: "66", beskrivelse: "Tjenester tilknyttet finansiering" },
  ],
  "helse-og-omsorg": [
    { kodePrefix: "86", beskrivelse: "Helsetjenester" },
    { kodePrefix: "87", beskrivelse: "Pleie- og omsorgstjenester i institusjon" },
    { kodePrefix: "88", beskrivelse: "Sosiale omsorgstjenester uten botilbud" },
  ],
  "reiseliv-hotell-og-servering": [
    { kodePrefix: "55", beskrivelse: "Overnattingsvirksomhet" },
    { kodePrefix: "56", beskrivelse: "Serveringsvirksomhet" },
    { kodePrefix: "79", beskrivelse: "Reisebyra og reisearrangorer" },
  ],
  "profesjonelle-tjenester-og-radgivning": [
    { kodePrefix: "69", beskrivelse: "Juridisk og regnskapsmessig tjenesteyting" },
    { kodePrefix: "70", beskrivelse: "Hovedkontor og administrativ radgivning" },
    { kodePrefix: "71", beskrivelse: "Arkitekt- og teknisk konsulentvirksomhet" },
    { kodePrefix: "73", beskrivelse: "Reklame og markedsundersokelser" },
    { kodePrefix: "78", beskrivelse: "Arbeidskrafttjenester" },
  ],
  "media-kultur-og-underholdning": [
    { kodePrefix: "58.1", beskrivelse: "Forlagsvirksomhet" },
    { kodePrefix: "59", beskrivelse: "Film-, video- og TV-produksjon" },
    { kodePrefix: "60", beskrivelse: "Radio- og fjernsynskringkasting" },
    { kodePrefix: "90", beskrivelse: "Kunstnerisk virksomhet og underholdning" },
    { kodePrefix: "93", beskrivelse: "Sports- og fritidsaktiviteter" },
  ],
  "landbruk-skog-og-naturressurser": [
    { kodePrefix: "01", beskrivelse: "Jordbruk og tjenester tilknyttet jordbruk" },
    { kodePrefix: "02", beskrivelse: "Skogbruk" },
    { kodePrefix: "05", beskrivelse: "Bryting av kull og brunkull" },
    { kodePrefix: "07", beskrivelse: "Bryting av metallholdig malm" },
    { kodePrefix: "08", beskrivelse: "Bergverksdrift ellers" },
  ],
};

const bp = (slug: string, relevans: string, sortering: number): BransjeProsessSeed => ({
  slug,
  relevans,
  sortering,
});

const bransjeProsesserSeed: Record<string, BransjeProsessSeed[]> = {
  "distribusjon-og-engros": [bp("market-to-lead", "core", 10), bp("lead-to-quote", "core", 20), bp("order-to-cash", "core", 30), bp("procure-to-pay", "core", 40), bp("forecast-to-plan", "core", 50), bp("inventory-to-deliver", "core", 60), bp("financial-plan-to-report", "support", 70)],
  "retail-og-netthandel": [bp("market-to-lead", "core", 10), bp("order-to-cash", "core", 20), bp("procure-to-pay", "core", 30), bp("forecast-to-plan", "core", 40), bp("inventory-to-deliver", "core", 50), bp("service-to-resolution", "core", 60), bp("financial-plan-to-report", "support", 70)],
  "mat-drikke-og-sjomat": [bp("forecast-to-plan", "core", 10), bp("plan-to-produce", "core", 20), bp("inventory-to-deliver", "core", 30), bp("order-to-cash", "core", 40), bp("procure-to-pay", "core", 50), bp("concept-to-launch", "differentiating", 60), bp("financial-plan-to-report", "support", 70)],
  "industriell-produksjon": [bp("forecast-to-plan", "core", 10), bp("plan-to-produce", "core", 20), bp("procure-to-pay", "core", 30), bp("inventory-to-deliver", "core", 40), bp("order-to-cash", "core", 50), bp("maintain-to-operate", "core", 60), bp("financial-plan-to-report", "support", 70)],
  "kjemi-og-prosessindustri": [bp("concept-to-launch", "differentiating", 10), bp("forecast-to-plan", "core", 20), bp("plan-to-produce", "core", 30), bp("procure-to-pay", "core", 40), bp("inventory-to-deliver", "core", 50), bp("maintain-to-operate", "core", 60), bp("financial-plan-to-report", "support", 70)],
  "maskiner-utstyr-og-maritim-teknologi": [bp("lead-to-quote", "core", 10), bp("plan-to-produce", "core", 20), bp("procure-to-pay", "core", 30), bp("inventory-to-deliver", "core", 40), bp("service-to-resolution", "differentiating", 50), bp("maintain-to-operate", "core", 60), bp("financial-plan-to-report", "support", 70)],
  "bygg-og-anlegg": [bp("lead-to-quote", "core", 10), bp("procure-to-pay", "core", 20), bp("forecast-to-plan", "support", 30), bp("inventory-to-deliver", "support", 40), bp("maintain-to-operate", "core", 50), bp("hire-to-retire", "core", 60), bp("financial-plan-to-report", "core", 70)],
  "eiendom-og-facility": [bp("market-to-lead", "core", 10), bp("lead-to-quote", "core", 20), bp("service-to-resolution", "core", 30), bp("maintain-to-operate", "core", 40), bp("procure-to-pay", "support", 50), bp("financial-plan-to-report", "core", 60)],
  "energi-kraft-og-fornybar": [bp("forecast-to-plan", "core", 10), bp("maintain-to-operate", "core", 20), bp("procure-to-pay", "core", 30), bp("service-to-resolution", "support", 40), bp("financial-plan-to-report", "core", 50)],
  "olje-gass-og-offshore-service": [bp("lead-to-quote", "core", 10), bp("procure-to-pay", "core", 20), bp("plan-to-produce", "support", 30), bp("inventory-to-deliver", "core", 40), bp("maintain-to-operate", "core", 50), bp("financial-plan-to-report", "core", 60)],
  "transport-logistikk-og-shipping": [bp("order-to-cash", "core", 10), bp("procure-to-pay", "core", 20), bp("forecast-to-plan", "core", 30), bp("inventory-to-deliver", "core", 40), bp("maintain-to-operate", "core", 50), bp("financial-plan-to-report", "support", 60)],
  "teknologi-og-it-tjenester": [bp("market-to-lead", "core", 10), bp("lead-to-quote", "core", 20), bp("order-to-cash", "core", 30), bp("service-to-resolution", "core", 40), bp("concept-to-launch", "differentiating", 50), bp("hire-to-retire", "support", 60), bp("financial-plan-to-report", "core", 70)],
  "finans-forsikring-og-investering": [bp("market-to-lead", "core", 10), bp("lead-to-quote", "core", 20), bp("order-to-cash", "core", 30), bp("service-to-resolution", "core", 40), bp("financial-plan-to-report", "core", 50), bp("hire-to-retire", "support", 60)],
  "helse-og-omsorg": [bp("lead-to-quote", "support", 10), bp("service-to-resolution", "core", 20), bp("procure-to-pay", "core", 30), bp("forecast-to-plan", "core", 40), bp("hire-to-retire", "core", 50), bp("financial-plan-to-report", "support", 60)],
  "reiseliv-hotell-og-servering": [bp("market-to-lead", "core", 10), bp("lead-to-quote", "core", 20), bp("order-to-cash", "core", 30), bp("procure-to-pay", "core", 40), bp("forecast-to-plan", "core", 50), bp("service-to-resolution", "core", 60), bp("financial-plan-to-report", "support", 70)],
  "profesjonelle-tjenester-og-radgivning": [bp("market-to-lead", "core", 10), bp("lead-to-quote", "core", 20), bp("order-to-cash", "core", 30), bp("hire-to-retire", "core", 40), bp("financial-plan-to-report", "support", 50)],
  "media-kultur-og-underholdning": [bp("market-to-lead", "core", 10), bp("concept-to-launch", "core", 20), bp("lead-to-quote", "support", 30), bp("order-to-cash", "core", 40), bp("service-to-resolution", "support", 50), bp("financial-plan-to-report", "support", 60)],
  "landbruk-skog-og-naturressurser": [bp("forecast-to-plan", "core", 10), bp("plan-to-produce", "core", 20), bp("procure-to-pay", "core", 30), bp("inventory-to-deliver", "core", 40), bp("maintain-to-operate", "core", 50), bp("financial-plan-to-report", "support", 60)],
};

const p = (
  slug: string,
  parentSlug: string | null,
  level: number,
  sortering: number,
  navn: string,
  kortnavn: string | null,
  beskrivelse: string,
  input: string | null,
  output: string | null,
  roller: string | null,
  kpi: string | null
): ProsessSeed => ({ slug, parentSlug, level, sortering, navn, kortnavn, beskrivelse, input, output, roller, kpi });

const prosesserSeed: ProsessSeed[] = [
  p("market-to-lead", null, 1, 10, "Market to Lead", "M2L", "Identifiser markeder, segmenter og potensielle kunder for a skape kvalifiserte leads.", "Markedsdata, segmenter, kampanjeplaner", "Kvalifiserte leads og prioriterte segmenter", "Marked, salg, forretningsutvikling", "Lead-volum, lead-kvalitet, kampanje-ROI"),
  p("lead-to-quote", null, 1, 20, "Lead to Quote", "L2Q", "Konverter behov til tilbud, pris og kommersielle vilkar.", "Kvalifiserte leads, behov, produkt- og prisdata", "Tilbud, kontraktsforslag og prognose", "Salg, presales, juridisk, finance", "Tilbudsrate, win rate, tilbudstid"),
  p("order-to-cash", null, 1, 30, "Order to Cash", "O2C", "Handter kundeordre fra mottak til levering, faktura og betaling.", "Kundeordre, avtaler, lagerstatus, kredittdata", "Leveranse, faktura, innbetaling og avstemt kundefordring", "Salg, kundeservice, lager, logistikk, finance", "OTIF, ordrecycle time, DSO, fakturafeil"),
  p("procure-to-pay", null, 1, 40, "Procure to Pay", "P2P", "Planlegg, kjop, motta, kontroller og betal varer og tjenester.", "Innkjopsbehov, leverandoravtaler, budsjett", "Mottatte varer/tjenester, bokfort kostnad og betalt leverandor", "Innkjop, lager, fagavdeling, finance", "Avtaledekning, leverandor-OTD, fakturamatch, kostnadsavvik"),
  p("forecast-to-plan", null, 1, 50, "Forecast to Plan", "F2P", "Omsett ettersporsel, kapasitet og okonomiske mal til planer.", "Historikk, pipeline, kapasitet, budsjett", "Ettersporselsplan, produksjons-/innkjopsplan og scenario", "Planlegging, salg, supply chain, finance", "Prognosenoyaktighet, planstabilitet, servicegrad"),
  p("plan-to-produce", null, 1, 60, "Plan to Produce", "P2M", "Planlegg og gjennomfor produksjon fra materialbehov til ferdig vare.", "Produksjonsplan, BOM/resept, materialer, kapasitet", "Ferdig vare, produksjonsavvik og kostnadsdata", "Produksjon, planlegging, kvalitet, vedlikehold", "OEE, vrak, gjennomlopstid, planoppfyllelse"),
  p("inventory-to-deliver", null, 1, 70, "Inventory to Deliver", "I2D", "Styr lager, plukk, pakk, transport og leveranse til kunde eller lokasjon.", "Lagerbeholdning, ordre, transportkrav", "Plukket, pakket og levert forsendelse med sporbar status", "Lager, logistikk, transport, kundeservice", "Plukknoyaktighet, lagerdager, OTIF, fraktkost per ordre"),
  p("service-to-resolution", null, 1, 80, "Service to Resolution", "S2R", "Motta, prioriter og los kunde-/servicehenvendelser til ferdig lost sak.", "Henvendelser, avtaler, garantier, servicehistorikk", "Lost sak, serviceordre og kundeoppdatering", "Kundeservice, tekniker, support, produkt", "Forstelinjelosning, responstid, SLA, NPS"),
  p("concept-to-launch", null, 1, 90, "Concept to Launch", "C2L", "Utvikle nye produkter, tjenester eller konsepter fra ide til lansering.", "Ideer, markedsbehov, business case", "Lansert produkt/tjeneste, godkjent masterdata og kommersiell plan", "Produkt, R&D, salg, kvalitet, supply chain", "Time-to-market, lanseringspresisjon, portefoljeverdi"),
  p("maintain-to-operate", null, 1, 100, "Maintain to Operate", "M2O", "Sikre drift av anlegg, utstyr og ressurser gjennom vedlikehold og beredskap.", "Anleggsregister, sensordata, vedlikeholdsplan", "Tilgjengelige aktiva, lukket arbeidsordre og dokumentert tilstand", "Drift, vedlikehold, HMS, teknisk", "Oppetid, MTBF, MTTR, vedlikeholdskost"),
  p("hire-to-retire", null, 1, 110, "Hire to Retire", "H2R", "Handter medarbeiderlivslop fra rekruttering til avslutning.", "Bemanningsbehov, kandidater, kontrakter", "Ansatte, kompetanse, timer, lonnsgrunnlag og avsluttet arbeidsforhold", "HR, leder, payroll, finance", "Time-to-hire, turnover, sykefravaer, kompetansedekning"),
  p("financial-plan-to-report", null, 1, 120, "Financial Plan to Report", "FP2R", "Planlegg, bokfor, avstem, konsolider og rapporter okonomisk resultat.", "Budsjett, transaksjoner, masterdata, regelverk", "Ledelsesrapportering, regnskap, prognose og myndighetsrapportering", "Finance, controller, ledelse, revisor", "Closing time, forecast accuracy, avstemmingsavvik, rapporteringsfrist"),

  p("market-insight", "market-to-lead", 2, 10, "Market insight", null, "Analyser marked, konkurrenter og segmenter.", "Markedsdata og kundedata", "Segmenthypoteser og prioriteringer", "Marked, analyse", "Segmentverdi, datadekning"),
  p("campaign-planning", "market-to-lead", 2, 20, "Campaign planning", null, "Planlegg kampanjer, kanaler og budskap.", "Segmenter og kampanjemal", "Kampanjeplan og budsjett", "Marked, salg", "Kampanje-ROI, CPL"),
  p("lead-capture", "market-to-lead", 2, 30, "Lead capture", null, "Fang opp leads fra digitale og manuelle kilder.", "Kampanjer, events, webskjema", "Nye leads", "Marked, SDR", "Lead-volum, konverteringsrate"),
  p("lead-qualification", "market-to-lead", 2, 40, "Lead qualification", null, "Scor og kvalifiser leads for salgsoppfolging.", "Leads og firmadata", "MQL/SQL", "SDR, salg", "MQL til SQL, kvalifiseringstid"),
  p("opportunity-discovery", "lead-to-quote", 2, 10, "Opportunity discovery", null, "Avklar behov, beslutningstakere og verdi.", "Lead og kundedialog", "Kvalifisert mulighet", "Salg, presales", "Discovery completion, stage conversion"),
  p("solution-design", "lead-to-quote", 2, 20, "Solution design", null, "Sett sammen losning, omfang og leveransemodell.", "Behov, produktdata, kapasitet", "Losningsforslag", "Presales, produkt, drift", "Design cycle time, marginindikasjon"),
  p("pricing-and-approval", "lead-to-quote", 2, 30, "Pricing and approval", null, "Beregn pris og hent nodvendige godkjenninger.", "Kost, prisregler, rabattpolicy", "Godkjent pris", "Salg, finance, leder", "Rabattnivaa, approval time"),
  p("quote-issue", "lead-to-quote", 2, 40, "Quote issue", null, "Send tilbud og styr gyldighet, versjoner og forhandling.", "Godkjent pris og losning", "Tilbud/kontrakt", "Salg, juridisk", "Quote cycle time, win rate"),
  p("order-capture", "order-to-cash", 2, 10, "Order capture", null, "Registrer og valider kundeordre.", "Kundeordre, avtale, kundeinfo", "Validert ordre", "Salg, kundeservice", "Ordrefeil, ordrebehandlingstid"),
  p("credit-and-availability-check", "order-to-cash", 2, 20, "Credit and availability check", null, "Kontroller kreditt, lager og leveringsmulighet.", "Validert ordre, kredittdata, ATP", "Frigitt eller blokkert ordre", "Finance, kundeservice, lager", "Kredittblokkeringer, ATP-noyaktighet"),
  p("fulfilment-and-delivery", "order-to-cash", 2, 30, "Fulfilment and delivery", null, "Plukk, produser eller lever ordre til kunde.", "Frigitt ordre, lager/produksjon", "Levert ordre", "Lager, produksjon, logistikk", "OTIF, leveringspresisjon"),
  p("billing-and-collection", "order-to-cash", 2, 40, "Billing and collection", null, "Fakturer, folg opp innbetaling og avstem.", "Leveranse, pris, kontrakt", "Faktura, betaling, avstemming", "Finance, kundeservice", "DSO, fakturafeil, inkassograd"),
  p("purchase-requisition", "procure-to-pay", 2, 10, "Purchase requisition", null, "Opprett og godkjenn innkjopsbehov.", "Behov, budsjett, avtale", "Godkjent rekvisisjon", "Fagavdeling, innkjop, leder", "Approval time, maverick spend"),
  p("supplier-selection", "procure-to-pay", 2, 20, "Supplier selection", null, "Velg leverandor og kommersielle vilkar.", "Rekvisisjon, avtaler, leverandordata", "Valgt leverandor", "Innkjop, fagavdeling", "Avtaledekning, savings"),
  p("purchase-order", "procure-to-pay", 2, 30, "Purchase order", null, "Opprett og send innkjopsordre.", "Godkjent rekvisisjon og leverandor", "Sendt PO", "Innkjop", "PO cycle time, PO accuracy"),
  p("receipt-and-invoice-match", "procure-to-pay", 2, 40, "Receipt and invoice match", null, "Motta varer/tjenester og match faktura.", "PO, pakkseddel, faktura", "Godkjent faktura", "Lager, mottak, finance", "Match rate, avvik per faktura"),
  p("supplier-payment", "procure-to-pay", 2, 50, "Supplier payment", null, "Betal leverandor og avstem apne poster.", "Godkjent faktura, betalingsplan", "Betalt og avstemt leverandorpost", "Finance", "Betaling til forfall, cash discount"),
  p("demand-forecasting", "forecast-to-plan", 2, 10, "Demand forecasting", null, "Lag prognose basert pa historikk, pipeline og marked.", "Historikk, kampanjer, salgspipeline", "Ettersporselsprognose", "Planlegging, salg", "Forecast accuracy, bias"),
  p("capacity-planning", "forecast-to-plan", 2, 20, "Capacity planning", null, "Avstem ettersporsel mot kapasitet og begrensninger.", "Prognose, ressursdata, kapasitet", "Kapasitetsplan", "Planlegging, drift", "Capacity utilization, bottleneck count"),
  p("supply-planning", "forecast-to-plan", 2, 30, "Supply planning", null, "Sett forsyningsplan for innkjop, produksjon og lager.", "Prognose, lager, ledetider", "Forsyningsplan", "Supply chain, innkjop", "Servicegrad, lagerdekning"),
  p("scenario-review", "forecast-to-plan", 2, 40, "Scenario review", null, "Vurder scenarioer og godkjenn plan.", "Planforslag, finansmal", "Godkjent plan", "Ledelse, finance, supply chain", "Planavvik, scenarioverdi"),
  p("production-planning", "plan-to-produce", 2, 10, "Production planning", null, "Lag produksjonsplan og prioriter kapasitetsbruk.", "Ettersporsel, BOM/resept, kapasitet", "Produksjonsplan", "Planlegging, produksjon", "Planoppfyllelse, kapasitetsutnyttelse"),
  p("material-staging", "plan-to-produce", 2, 20, "Material staging", null, "Sikre at materialer er tilgjengelige for produksjon.", "Produksjonsplan, lager, innkjop", "Klargjorte materialer", "Lager, produksjon", "Materialtilgjengelighet, stopp pga materialer"),
  p("production-execution", "plan-to-produce", 2, 30, "Production execution", null, "Gjennomfor produksjonsordre og registrer forbruk/resultat.", "Klargjorte materialer, arbeidsordre", "Produsert mengde og avvik", "Produksjon, kvalitet", "OEE, vrak, gjennomlopstid"),
  p("quality-release", "plan-to-produce", 2, 40, "Quality release", null, "Kontroller kvalitet og frigjore ferdig vare.", "Produserte varer, testdata", "Frigitt eller sperret vare", "Kvalitet, produksjon", "First pass yield, kvalitetsavvik"),
  p("inventory-control", "inventory-to-deliver", 2, 10, "Inventory control", null, "Styr beholdning, lokasjoner og disponering.", "Beholdning, transaksjoner, behov", "Tilgjengelig lagerstatus", "Lager, supply chain", "Lagerdager, beholdningsnoyaktighet"),
  p("pick-and-pack", "inventory-to-deliver", 2, 20, "Pick and pack", null, "Plukk, pakk og klargjor forsendelse.", "Leveringsordre, plukkliste", "Pakket forsendelse", "Lager", "Plukknoyaktighet, plukk per time"),
  p("transport-booking", "inventory-to-deliver", 2, 30, "Transport booking", null, "Book transport og generer fraktdokumenter.", "Forsendelse, transportkrav", "Transportbestilling og dokumenter", "Logistikk, transportor", "Fraktkost, bookingfeil"),
  p("delivery-confirmation", "inventory-to-deliver", 2, 40, "Delivery confirmation", null, "Bekreft levering og oppdater status.", "Transportstatus, POD", "Leveringsbekreftelse", "Logistikk, kundeservice", "OTIF, POD coverage"),
  p("case-intake", "service-to-resolution", 2, 10, "Case intake", null, "Motta og kategoriser henvendelser.", "E-post, telefon, portal, IoT-varsel", "Registrert sak", "Support, kundeservice", "First response, kanalvolum"),
  p("triage-and-dispatch", "service-to-resolution", 2, 20, "Triage and dispatch", null, "Prioriter sak og alloker riktig ressurs.", "Sak, SLA, kompetanse, lokasjon", "Tildelt sak/serviceordre", "Supportleder, dispatcher", "SLA-risk, dispatch time"),
  p("resolution-work", "service-to-resolution", 2, 30, "Resolution work", null, "Los saken gjennom fjernhjelp, feltservice eller korrigering.", "Tildelt sak, historikk, deler", "Lost sak eller eskalering", "Tekniker, support, produkt", "MTTR, first-time-fix"),
  p("closure-and-learning", "service-to-resolution", 2, 40, "Closure and learning", null, "Lukk sak og fang erfaring for forbedring.", "Lost sak, rotarsak, tilbakemelding", "Lukket sak og kunnskapsartikkel", "Support, kvalitet, produkt", "CSAT, repeat incidents"),
  p("idea-capture", "concept-to-launch", 2, 10, "Idea capture", null, "Samle og prioritere ideer og markedsbehov.", "Ideer, kundeinnsikt, regulatorikk", "Prioritert initiativ", "Produkt, salg, marked", "Idekonvertering, portefoljeverdi"),
  p("business-case", "concept-to-launch", 2, 20, "Business case", null, "Valider verdi, risiko og investering.", "Initiativ, estimater, markedsdata", "Godkjent business case", "Produkt, finance, ledelse", "NPV, risk score"),
  p("development-and-validation", "concept-to-launch", 2, 30, "Development and validation", null, "Utvikle, teste og validere produkt/tjeneste.", "Krav, design, ressurser", "Validert losning", "R&D, kvalitet, drift", "Test pass rate, cycle time"),
  p("launch-readiness", "concept-to-launch", 2, 40, "Launch readiness", null, "Klargjor masterdata, salg, drift og support for lansering.", "Validert losning, lanseringsplan", "Lanseringsklar organisasjon", "Produkt, salg, supply chain, support", "Launch readiness, adoption"),
  p("asset-register", "maintain-to-operate", 2, 10, "Asset register", null, "Etabler og vedlikehold anleggs- og utstyrsregister.", "Utstyr, lokasjon, kritikalitet", "Oppdatert aktivaoversikt", "Drift, teknisk, finance", "Datakvalitet, dekningsgrad"),
  p("maintenance-planning", "maintain-to-operate", 2, 20, "Maintenance planning", null, "Planlegg forebyggende og korrigerende vedlikehold.", "Aktiva, tilstand, intervaller", "Vedlikeholdsplan", "Vedlikehold, drift", "Planlagt vs akutt arbeid"),
  p("work-order-execution", "maintain-to-operate", 2, 30, "Work order execution", null, "Gjennomfor arbeidsordre med timer, deler og funn.", "Arbeidsordre, deler, tekniker", "Fullfort arbeidsordre", "Tekniker, lager, HMS", "MTTR, backlog, sikkerhetsavvik"),
  p("reliability-improvement", "maintain-to-operate", 2, 40, "Reliability improvement", null, "Analyser feil og forbedre driftssikkerhet.", "Historikk, rotarsak, kost", "Forbedringstiltak", "Vedlikehold, engineering, drift", "MTBF, oppetid, vedlikeholdskost"),
  p("workforce-planning", "hire-to-retire", 2, 10, "Workforce planning", null, "Planlegg bemanning, roller og kompetansebehov.", "Strategi, kapasitet, turnover", "Bemanningsplan", "HR, ledere, finance", "Dekningsgrad, kost mot budsjett"),
  p("recruit-and-onboard", "hire-to-retire", 2, 20, "Recruit and onboard", null, "Rekrutter, ansett og onboard medarbeidere.", "Kandidater, stillinger, kontrakter", "Onboardet medarbeider", "HR, leder, IT", "Time-to-hire, onboarding completion"),
  p("time-payroll-and-performance", "hire-to-retire", 2, 30, "Time, payroll and performance", null, "Handter tid, fravaer, lonn og prestasjon.", "Timer, fravaer, mal, tariff", "Lonnsgrunnlag og prestasjonsdata", "HR, payroll, leder", "Payroll accuracy, sykefravaer"),
  p("offboarding", "hire-to-retire", 2, 40, "Offboarding", null, "Avslutt arbeidsforhold og sikre kunnskap/tilganger.", "Oppsigelse, utstyr, tilgangsliste", "Avsluttet arbeidsforhold", "HR, leder, IT", "Offboarding completion, tilgangsavvik"),
  p("budget-and-forecast", "financial-plan-to-report", 2, 10, "Budget and forecast", null, "Sett budsjett, prognoser og scenarioer.", "Historikk, mal, driverdata", "Budsjett og prognose", "Finance, ledelse, fagomrader", "Forecast accuracy, budsjettavvik"),
  p("record-to-ledger", "financial-plan-to-report", 2, 20, "Record to ledger", null, "Bokfor transaksjoner og periodiser riktig.", "Bilag, ordre, faktura, bank", "Oppdatert hovedbok", "Regnskap, finance operations", "Automatiseringsgrad, bokforingsfeil"),
  p("period-close", "financial-plan-to-report", 2, 30, "Period close", null, "Avstem, periodiser og lukk perioden.", "Hovedbok, subledger, avstemminger", "Lukket periode", "Controller, regnskap", "Closing days, apne avvik"),
  p("management-reporting", "financial-plan-to-report", 2, 40, "Management reporting", null, "Rapporter resultat, kontantstrom og KPI-er.", "Lukket periode, budsjett, forecast", "Ledelsesrapport og myndighetsrapportering", "Finance, ledelse, revisor", "Rapporteringsfrist, rapportkvalitet"),

  p("receive-customer-order", "order-capture", 3, 10, "Receive customer order", null, "Motta ordre fra portal, EDI, salg eller kundeservice.", "Bestilling og kundedata", "Opprettet ordreutkast", "Kundeservice, salg", "Ordrekanalmiks, manuelle feil"),
  p("validate-order-masterdata", "order-capture", 3, 20, "Validate order masterdata", null, "Valider kunde, vare, pris, leveringsadresse og avgifter.", "Ordreutkast og masterdata", "Validert ordre", "Kundeservice, masterdata", "Ordrefeil, valideringsavvik"),
  p("confirm-order", "order-capture", 3, 30, "Confirm order", null, "Bekreft ordre og forventet levering til kunde.", "Validert ordre og ATP", "Ordrebekreftelse", "Kundeservice", "Bekreftelsestid"),
  p("credit-check", "credit-and-availability-check", 3, 10, "Credit check", null, "Kontroller kredittgrense, betalingshistorikk og sperrer.", "Kunde, ordreverdi, apne poster", "Kredittstatus", "Finance", "Kredittblokkeringer, tapsrisiko"),
  p("availability-promise", "credit-and-availability-check", 3, 20, "Availability promise", null, "Beregn tilgjengelighet og lovet leveringsdato.", "Lager, innkjop, produksjonsplan", "Lovet leveringsdato", "Supply chain", "ATP-noyaktighet, servicegrad"),
  p("release-for-fulfilment", "fulfilment-and-delivery", 3, 10, "Release for fulfilment", null, "Frigi ordre til lager, produksjon eller direkteleveranse.", "Frigitt kreditt og tilgjengelighet", "Leveringsordre", "Kundeservice, lager", "Frigivelsestid"),
  p("ship-or-deliver", "fulfilment-and-delivery", 3, 20, "Ship or deliver", null, "Send varer eller bekreft levert tjeneste.", "Leveringsordre, transport", "Levert ordre", "Lager, logistikk, drift", "OTIF, transportavvik"),
  p("invoice-customer", "billing-and-collection", 3, 10, "Invoice customer", null, "Generer og send korrekt faktura.", "Leveranse, pris, avgift, kontrakt", "Sendt faktura", "Regnskap, kundeservice", "Fakturafeil, fakturatid"),
  p("collect-payment", "billing-and-collection", 3, 20, "Collect payment", null, "Folg opp betaling, purring og innbetaling.", "Faktura, betalingsbetingelser", "Innbetaling", "Finance", "DSO, forfalte poster"),
  p("reconcile-receivable", "billing-and-collection", 3, 30, "Reconcile receivable", null, "Match innbetaling og avstem kundefordring.", "Bank, reskontro, faktura", "Avstemt kundefordring", "Regnskap", "Umatchede innbetalinger"),
  p("identify-purchase-need", "purchase-requisition", 3, 10, "Identify purchase need", null, "Oppdag behov fra lager, prosjekt, produksjon eller drift.", "Behov, min/max, prosjektplan", "Innkjopsbehov", "Fagavdeling, lager", "Behov til rekvisisjon"),
  p("approve-requisition", "purchase-requisition", 3, 20, "Approve requisition", null, "Godkjenn behov mot budsjett, policy og fullmakt.", "Rekvisisjon, budsjett", "Godkjent rekvisisjon", "Leder, finance", "Approval time, avvisningsrate"),
  p("create-purchase-order", "purchase-order", 3, 10, "Create purchase order", null, "Opprett PO med vare, pris, leveringssted og vilkar.", "Godkjent rekvisisjon", "PO-kladd", "Innkjop", "PO accuracy"),
  p("send-purchase-order", "purchase-order", 3, 20, "Send purchase order", null, "Send PO og fang ordrebekreftelse.", "Godkjent PO", "Bekreftet PO", "Innkjop, leverandor", "Supplier confirmation time"),
  p("receive-goods", "receipt-and-invoice-match", 3, 10, "Receive goods", null, "Registrer varemottak og avvik.", "PO, pakkseddel, leveranse", "Varemottak", "Mottak, lager", "Mottaksavvik, mottakstid"),
  p("service-entry", "receipt-and-invoice-match", 3, 20, "Service entry", null, "Bekreft leverte tjenester for fakturamatch.", "PO, timeliste/leveransebevis", "Godkjent tjenestemottak", "Fagavdeling", "Ubekreftede tjenester"),
  p("three-way-match", "receipt-and-invoice-match", 3, 30, "Three-way match", null, "Match PO, mottak og faktura for automatisk godkjenning.", "PO, mottak, faktura", "Godkjent eller avviksmarkert faktura", "AP, innkjop", "Touchless match rate"),
  p("payment-run", "supplier-payment", 3, 10, "Payment run", null, "Planlegg og gjennomfor betalingsforslag.", "Godkjente fakturaer, bank", "Sendt betaling", "Finance", "Betaling til forfall"),
  p("supplier-reconciliation", "supplier-payment", 3, 20, "Supplier reconciliation", null, "Avstem leverandorreskontro og handter avvik.", "Betalinger, fakturaer, kreditnotaer", "Avstemt leverandorpost", "Regnskap", "Uavklarte poster"),
  p("create-master-production-schedule", "production-planning", 3, 10, "Create production schedule", null, "Bryt plan ned til produksjonsordre og kapasitetsbehov.", "Ettersporsel, lager, kapasitet", "Produksjonsprogram", "Planlegger", "Planstabilitet"),
  p("sequence-production", "production-planning", 3, 20, "Sequence production", null, "Sekvenser ordre for setup, kapasitet og prioritet.", "Produksjonsprogram, begrensninger", "Sekvensert plan", "Planlegging, produksjon", "Setup-tid, planoppfyllelse"),
  p("reserve-materials", "material-staging", 3, 10, "Reserve materials", null, "Reserver materialer og komponenter til produksjon.", "BOM/resept, beholdning", "Materialreservasjon", "Lager, planlegging", "Materialdekning"),
  p("stage-materials-to-line", "material-staging", 3, 20, "Stage materials to line", null, "Flytt og klargjor materialer ved linje/arbeidsplass.", "Reservasjon, plukkliste", "Klargjort materialsett", "Lager, produksjon", "Linjestopp pga materialer"),
  p("release-production-order", "production-execution", 3, 10, "Release production order", null, "Frigi produksjonsordre med riktig versjon og dokumentasjon.", "Sekvensert plan, materialstatus", "Frigitt produksjonsordre", "Planlegging, produksjon", "Frigivelsesavvik"),
  p("confirm-operations", "production-execution", 3, 20, "Confirm operations", null, "Registrer operasjoner, forbruk, tid og ferdigmelding.", "Produksjonsordre, materialer", "Operasjonsbekreftelser", "Produksjon", "OEE, rapporteringsgrad"),
  p("capture-production-variance", "production-execution", 3, 30, "Capture production variance", null, "Fang vrak, svinn, stopp og kostnadsavvik.", "Produksjonsdata, kvalitet", "Avviksdata", "Produksjon, controller", "Vrakrate, kostnadsavvik"),
  p("quality-inspection", "quality-release", 3, 10, "Quality inspection", null, "Gjennomfor inspeksjon, test eller laboratoriekontroll.", "Testplan, prove, batch/ordre", "Testresultat", "Kvalitet", "First pass yield"),
  p("release-finished-goods", "quality-release", 3, 20, "Release finished goods", null, "Frigjor, sperr eller omarbeid ferdig vare.", "Testresultat, avvik", "Frigitt beholdning", "Kvalitet, lager", "Sperret lager, release time"),
  p("cycle-counting", "inventory-control", 3, 10, "Cycle counting", null, "Tell og korriger beholdning etter plan eller avvik.", "Lagerstatus, telleplan", "Korrigert beholdning", "Lager", "Inventory accuracy"),
  p("replenishment-control", "inventory-control", 3, 20, "Replenishment control", null, "Overvak min/max, sikkerhetslager og disponering.", "Beholdning, ettersporsel, ledetid", "Pafyllingsforslag", "Supply chain", "Stockout, lagerdager"),
  p("wave-or-pick-release", "pick-and-pack", 3, 10, "Wave or pick release", null, "Batch og frigi plukk etter prioritet, rute eller cut-off.", "Leveringsordre, lagerstatus", "Plukkliste", "Lagerleder", "Wave completion"),
  p("pack-and-label", "pick-and-pack", 3, 20, "Pack and label", null, "Pakk, merk og dokumenter forsendelse.", "Plukkede varer, emballasjekrav", "Pakket kolli", "Lager", "Pakkefeil, kolli per time"),
  p("select-carrier", "transport-booking", 3, 10, "Select carrier", null, "Velg transportor basert pa pris, SLA og kapasitet.", "Forsendelse, rater, avtaler", "Valgt transportor", "Logistikk", "Fraktkost, carrier performance"),
  p("proof-of-delivery", "delivery-confirmation", 3, 10, "Proof of delivery", null, "Motta POD og lukk leveranse.", "Transportstatus, mottakskvittering", "Bekreftet levering", "Logistikk, kundeservice", "POD coverage, leveringsavvik"),
  p("collect-budget-input", "budget-and-forecast", 3, 10, "Collect budget input", null, "Samle budsjettinput fra enheter og drivere.", "Driverdata, mal, historikk", "Budsjettinnspill", "Finance, fagomrader", "Innsendingsgrad"),
  p("consolidate-forecast", "budget-and-forecast", 3, 20, "Consolidate forecast", null, "Konsolider prognoser og scenarioer.", "Budsjettinnspill, pipeline, faktisk", "Konsolidert forecast", "Controller, finance", "Forecast accuracy"),
  p("post-subledger-transactions", "record-to-ledger", 3, 10, "Post subledger transactions", null, "Overfor transaksjoner fra ordre, lager, bank og reskontro.", "Subledger-transaksjoner", "Bokfort hovedbok", "Regnskap", "Interface errors"),
  p("manual-journal-entry", "record-to-ledger", 3, 20, "Manual journal entry", null, "Registrer og godkjenn manuelle bilag.", "Bilagsgrunnlag, fullmakt", "Bokfort bilag", "Regnskap, controller", "Manuelle bilag, godkjenningstid"),
  p("subledger-close", "period-close", 3, 10, "Subledger close", null, "Lukk reskontro, lager og andre subledgers.", "Subledger-status, avvik", "Lukket subledger", "AP, AR, lager, regnskap", "Open items, close readiness"),
  p("account-reconciliation", "period-close", 3, 20, "Account reconciliation", null, "Avstem balanseposter og dokumenter differanser.", "Hovedbok, kontoutdrag, subledger", "Godkjent avstemming", "Regnskap, controller", "Avstemmingsavvik"),
  p("close-period", "period-close", 3, 30, "Close period", null, "Lukk periode og sperr for uautoriserte posteringer.", "Avstemminger, periodiseringer", "Lukket periode", "Controller, regnskapssjef", "Closing days"),
  p("generate-management-pack", "management-reporting", 3, 10, "Generate management pack", null, "Lag rapportpakke for ledelse og styre.", "Lukket periode, KPI, budsjett", "Rapportpakke", "Finance, BI", "Rapporteringsfrist"),
  p("statutory-reporting", "management-reporting", 3, 20, "Statutory reporting", null, "Utarbeid myndighets- og regnskapsrapportering.", "Regnskap, regelverk, kontoplan", "Lovpabudt rapportering", "Regnskap, revisor", "Compliance avvik"),

  p("invoice-data-validation", "invoice-customer", 4, 10, "Invoice data validation", null, "Valider pris, avgift, leveranse og fakturaadresse for fakturering.", "Leveranse, pris, avgiftskode, kunde", "Fakturaklar ordre", "Regnskap, kundeservice", "Fakturablokkeringer"),
  p("invoice-dispatch", "invoice-customer", 4, 20, "Invoice dispatch", null, "Send faktura via EHF, e-post eller annen kanal og logg status.", "Fakturaklar ordre", "Sendt faktura", "Regnskap", "EHF-andel, utsendingsfeil"),
  p("goods-receipt-registration", "receive-goods", 4, 10, "Goods receipt registration", null, "Registrer mottatt mengde, lokasjon og batch/serie ved behov.", "PO, pakkseddel, fysisk mottak", "Registrert varemottak", "Mottak, lager", "Mottakstid, mengdeavvik"),
  p("receipt-quality-hold", "receive-goods", 4, 20, "Receipt quality hold", null, "Sett varer pa kvalitetskontroll eller sperret lager ved avvik.", "Varemottak, kvalitetsregler", "Frigitt eller sperret mottak", "Mottak, kvalitet", "Sperret mottak, avvik"),
  p("print-or-issue-shop-papers", "release-production-order", 4, 10, "Issue shop papers", null, "Utsted arbeidsinstruks, etiketter og produksjonsdokumentasjon.", "Frigitt produksjonsordre", "Produksjonsdokumentasjon", "Planlegging, produksjon", "Dokumentfeil"),
  p("backflush-materials", "confirm-operations", 4, 10, "Backflush materials", null, "Bokfor standard materialforbruk automatisk ved operasjonsbekreftelse.", "Operasjonsbekreftelse, BOM/resept", "Bokfort materialforbruk", "Produksjon, lager", "Forbruksavvik"),
  p("accounts-payable-close", "subledger-close", 4, 10, "Accounts payable close", null, "Lukk leverandorreskontro og handter apne avvik.", "AP-poster, betalinger, fakturaavvik", "Lukket AP", "AP, regnskap", "Apne AP-avvik"),
  p("accounts-receivable-close", "subledger-close", 4, 20, "Accounts receivable close", null, "Lukk kundereskontro og vurder tapsavsetninger.", "AR-poster, betalinger, purringer", "Lukket AR", "AR, regnskap", "Forfalte poster"),
  p("bank-reconciliation", "account-reconciliation", 4, 10, "Bank reconciliation", null, "Match banktransaksjoner mot hovedbok og reskontro.", "Bankfil, hovedbok, reskontro", "Avstemt bank", "Regnskap", "Umatchede bankposter"),
  p("period-lock", "close-period", 4, 10, "Period lock", null, "Sperr perioden etter godkjent close for a bevare rapporteringsgrunnlag.", "Godkjent close-sjekkliste", "Sperret periode", "Regnskapssjef, controller", "Etterposteringer"),
];

function tilBransje(seed: BransjeSeed): FpBransje {
  return {
    slug: seed.slug,
    navn: seed.navn,
    kortnavn: seed.kortnavn,
    beskrivelse: seed.beskrivelse,
    ikon: seed.ikon,
    naeringskodeAntall: naeringskoderSeed[seed.slug]?.length ?? 0,
    prosessAntall: bransjeProsesserSeed[seed.slug]?.length ?? 0,
  };
}

function prosessRaderFor(koblinger: BransjeProsessSeed[]): FpProsessRad[] {
  const rootMeta = new Map(koblinger.map((kobling) => [kobling.slug, kobling]));
  const inkluderte = new Set(koblinger.map((kobling) => kobling.slug));
  let endret = true;

  while (endret) {
    endret = false;
    for (const prosess of prosesserSeed) {
      if (prosess.parentSlug && inkluderte.has(prosess.parentSlug) && !inkluderte.has(prosess.slug)) {
        inkluderte.add(prosess.slug);
        endret = true;
      }
    }
  }

  return prosesserSeed
    .filter((prosess) => inkluderte.has(prosess.slug))
    .map((prosess) => ({
      id: prosess.slug,
      slug: prosess.slug,
      parentId: prosess.parentSlug,
      level: prosess.level,
      sortering: prosess.sortering,
      navn: prosess.navn,
      kortnavn: prosess.kortnavn,
      beskrivelse: prosess.beskrivelse,
      input: prosess.input,
      output: prosess.output,
      roller: prosess.roller,
      kpi: prosess.kpi,
      relevans: rootMeta.get(prosess.slug)?.relevans ?? null,
      bransjeSortering: rootMeta.get(prosess.slug)?.sortering ?? null,
    }));
}

export function hentSeedBransjer(): FpBransje[] {
  return [...bransjerSeed]
    .sort((a, b) => a.sortering - b.sortering || a.navn.localeCompare(b.navn, "nb"))
    .map(tilBransje);
}

export function hentSeedBransjeDetalj(slug: string): FpBransjeDetalj | null {
  const bransjeSeed = bransjerSeed.find((bransje) => bransje.slug === slug);
  if (!bransjeSeed) return null;

  const koblinger = bransjeProsesserSeed[slug] ?? [];

  return {
    bransje: tilBransje(bransjeSeed),
    naeringskoder: [...(naeringskoderSeed[slug] ?? [])],
    prosesser: byggProsessTre(prosessRaderFor(koblinger)),
    source: "seed",
  };
}
