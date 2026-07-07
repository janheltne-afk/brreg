-- Forretningsprosesser: bransjer, naeringskode-mapping og prosesshierarki.
-- Katalogen ligger i brreg-schemaet og brukes server-side av Next.js.

CREATE SCHEMA IF NOT EXISTS brreg;

CREATE TABLE IF NOT EXISTS brreg.fp_bransje (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug            TEXT NOT NULL UNIQUE,
    navn            TEXT NOT NULL,
    kortnavn        TEXT,
    beskrivelse     TEXT NOT NULL,
    ikon            TEXT,
    sortering       INTEGER NOT NULL DEFAULT 100,
    aktiv           BOOLEAN NOT NULL DEFAULT true,
    oppdatert       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brreg.fp_bransje_naeringskode (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bransje_id      BIGINT NOT NULL REFERENCES brreg.fp_bransje(id) ON DELETE CASCADE,
    kode_prefix     TEXT NOT NULL,
    beskrivelse     TEXT NOT NULL,
    sortering       INTEGER NOT NULL DEFAULT 100,
    UNIQUE (bransje_id, kode_prefix)
);

CREATE TABLE IF NOT EXISTS brreg.fp_prosess (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug            TEXT NOT NULL UNIQUE,
    parent_id       BIGINT REFERENCES brreg.fp_prosess(id) ON DELETE CASCADE,
    level           SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 4),
    sortering       INTEGER NOT NULL DEFAULT 100,
    navn            TEXT NOT NULL,
    kortnavn        TEXT,
    beskrivelse     TEXT NOT NULL,
    input           TEXT,
    output          TEXT,
    roller          TEXT,
    kpi             TEXT,
    aktiv           BOOLEAN NOT NULL DEFAULT true,
    oppdatert       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK ((level = 1 AND parent_id IS NULL) OR (level > 1 AND parent_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS brreg.fp_bransje_prosess (
    bransje_id      BIGINT NOT NULL REFERENCES brreg.fp_bransje(id) ON DELETE CASCADE,
    prosess_id      BIGINT NOT NULL REFERENCES brreg.fp_prosess(id) ON DELETE CASCADE,
    sortering       INTEGER NOT NULL DEFAULT 100,
    relevans        TEXT NOT NULL DEFAULT 'core',
    PRIMARY KEY (bransje_id, prosess_id)
);

CREATE INDEX IF NOT EXISTS ix_fp_bransje_sortering ON brreg.fp_bransje (aktiv, sortering, navn);
CREATE INDEX IF NOT EXISTS ix_fp_bransje_naeringskode_bransje ON brreg.fp_bransje_naeringskode (bransje_id, sortering);
CREATE INDEX IF NOT EXISTS ix_fp_bransje_naeringskode_prefix ON brreg.fp_bransje_naeringskode (kode_prefix);
CREATE INDEX IF NOT EXISTS ix_fp_prosess_parent ON brreg.fp_prosess (parent_id, sortering);
CREATE INDEX IF NOT EXISTS ix_fp_prosess_level_sortering ON brreg.fp_prosess (level, sortering);
CREATE INDEX IF NOT EXISTS ix_fp_bransje_prosess_prosess ON brreg.fp_bransje_prosess (prosess_id);

INSERT INTO brreg.fp_bransje (slug, navn, kortnavn, beskrivelse, ikon, sortering)
VALUES
('distribusjon-og-engros', 'Distribusjon og engros', 'Distribusjon', 'Grossister, importorer og distribusjonsvirksomhet med lager, sortiment, ordre og leveranse som kjerne.', 'Warehouse', 10),
('retail-og-netthandel', 'Retail og netthandel', 'Retail', 'Butikk, kjeder og netthandel med vareflyt, kampanjer, kundeopplevelse og marginstyring.', 'ShoppingBag', 20),
('mat-drikke-og-sjomat', 'Mat, drikke og sjomat', 'Mat og sjomat', 'Produksjon, foredling og handel med mat, drikke, fiskeri og oppdrett.', 'Fish', 30),
('industriell-produksjon', 'Industriell produksjon', 'Industri', 'Diskret og blandet produksjon med planlegging, produksjonsordre, kvalitet og leveranse.', 'Factory', 40),
('kjemi-og-prosessindustri', 'Kjemi og prosessindustri', 'Kjemi', 'Prosessindustri med resepter, batch, HMS, sporbarhet og kvalitet som styrende behov.', 'FlaskConical', 50),
('maskiner-utstyr-og-maritim-teknologi', 'Maskiner, utstyr og maritim teknologi', 'Utstyr', 'Utstyrsleverandorer, verksted, maritim teknologi og serviceintensive produktlivslop.', 'Wrench', 60),
('bygg-og-anlegg', 'Bygg og anlegg', 'Bygg/anlegg', 'Entreprenor, prosjekt, anlegg, tekniske fag og leverandorkjeder rundt bygg og infrastruktur.', 'HardHat', 70),
('eiendom-og-facility', 'Eiendom og facility', 'Eiendom', 'Eiendomsutvikling, forvaltning, drift, vedlikehold og facility services.', 'Building2', 80),
('energi-kraft-og-fornybar', 'Energi, kraft og fornybar', 'Energi', 'Kraft, nett, fornybar energi og energitjenester med anlegg, marked og drift.', 'Zap', 90),
('olje-gass-og-offshore-service', 'Olje, gass og offshore service', 'Offshore', 'Olje, gass, offshore service, subsea og leverandorer til energisektoren.', 'Anchor', 100),
('transport-logistikk-og-shipping', 'Transport, logistikk og shipping', 'Logistikk', 'Transport, spedisjon, lager, havn, shipping og mobil ressursutnyttelse.', 'Truck', 110),
('teknologi-og-it-tjenester', 'Teknologi og IT-tjenester', 'Teknologi', 'Programvare, IT-drift, konsulenttjenester, plattform, data og digitale produkter.', 'Cpu', 120),
('finans-forsikring-og-investering', 'Finans, forsikring og investering', 'Finans', 'Bank, forsikring, kapitalforvaltning, investering og finansiell infrastruktur.', 'Landmark', 130),
('helse-og-omsorg', 'Helse og omsorg', 'Helse', 'Helse, omsorg, klinikker, institusjoner og tjenester med pasient-, turnus- og kvalitetsflyt.', 'HeartPulse', 140),
('reiseliv-hotell-og-servering', 'Reiseliv, hotell og servering', 'Reiseliv', 'Hotell, servering, reiseliv, opplevelser og kapasitetsbaserte tjenester.', 'Hotel', 150),
('profesjonelle-tjenester-og-radgivning', 'Profesjonelle tjenester og radgivning', 'Tjenester', 'Konsulent, juridisk, revisjon, arkitektur, bemanning og kunnskapsbaserte tjenester.', 'BriefcaseBusiness', 160),
('media-kultur-og-underholdning', 'Media, kultur og underholdning', 'Media', 'Publisering, produksjon, rettigheter, arrangement, kultur og underholdning.', 'Clapperboard', 170),
('landbruk-skog-og-naturressurser', 'Landbruk, skog og naturressurser', 'Naturressurser', 'Landbruk, skogbruk, mineraler og naturressursbasert verdikjede.', 'Sprout', 180)
ON CONFLICT (slug) DO UPDATE SET
  navn = EXCLUDED.navn,
  kortnavn = EXCLUDED.kortnavn,
  beskrivelse = EXCLUDED.beskrivelse,
  ikon = EXCLUDED.ikon,
  sortering = EXCLUDED.sortering,
  aktiv = true,
  oppdatert = now();

WITH mapping(slug, kode_prefix, beskrivelse, sortering) AS (
  VALUES
  ('distribusjon-og-engros', '46', 'Agentur- og engroshandel', 10),
  ('distribusjon-og-engros', '45.3', 'Handel med deler og utstyr til motorvogner', 20),
  ('retail-og-netthandel', '47', 'Detaljhandel', 10),
  ('retail-og-netthandel', '45.1', 'Handel med motorvogner', 20),
  ('mat-drikke-og-sjomat', '03', 'Fiske, fangst og akvakultur', 10),
  ('mat-drikke-og-sjomat', '10', 'Produksjon av naerings- og nytelsesmidler', 20),
  ('mat-drikke-og-sjomat', '11', 'Produksjon av drikkevarer', 30),
  ('industriell-produksjon', '13', 'Tekstilproduksjon', 10),
  ('industriell-produksjon', '16', 'Trelast- og trevareproduksjon', 20),
  ('industriell-produksjon', '22', 'Gummi- og plastproduksjon', 30),
  ('industriell-produksjon', '25', 'Metallvareproduksjon', 40),
  ('industriell-produksjon', '28', 'Maskinproduksjon', 50),
  ('kjemi-og-prosessindustri', '19', 'Petroleums- og kullvareproduksjon', 10),
  ('kjemi-og-prosessindustri', '20', 'Kjemisk industri', 20),
  ('kjemi-og-prosessindustri', '21', 'Farmasoytisk industri', 30),
  ('maskiner-utstyr-og-maritim-teknologi', '26', 'Data- og elektronikkindustri', 10),
  ('maskiner-utstyr-og-maritim-teknologi', '27', 'Elektrisk utstyr', 20),
  ('maskiner-utstyr-og-maritim-teknologi', '30', 'Transportmiddelindustri', 30),
  ('maskiner-utstyr-og-maritim-teknologi', '33', 'Reparasjon og installasjon av maskiner', 40),
  ('bygg-og-anlegg', '41', 'Oppforing av bygninger', 10),
  ('bygg-og-anlegg', '42', 'Anleggsvirksomhet', 20),
  ('bygg-og-anlegg', '43', 'Spesialisert bygge- og anleggsvirksomhet', 30),
  ('eiendom-og-facility', '68', 'Omsetning og drift av fast eiendom', 10),
  ('eiendom-og-facility', '81', 'Tjenester tilknyttet eiendomsdrift', 20),
  ('energi-kraft-og-fornybar', '35', 'Elektrisitet, gass, damp og varmtvann', 10),
  ('energi-kraft-og-fornybar', '36', 'Vannforsyning', 20),
  ('olje-gass-og-offshore-service', '06', 'Utvinning av raolje og naturgass', 10),
  ('olje-gass-og-offshore-service', '09', 'Tjenester tilknyttet bergverksdrift og utvinning', 20),
  ('transport-logistikk-og-shipping', '49', 'Landtransport', 10),
  ('transport-logistikk-og-shipping', '50', 'Sjotransport', 20),
  ('transport-logistikk-og-shipping', '51', 'Lufttransport', 30),
  ('transport-logistikk-og-shipping', '52', 'Lagring og transporttjenester', 40),
  ('transport-logistikk-og-shipping', '53', 'Post og distribusjon', 50),
  ('teknologi-og-it-tjenester', '58.2', 'Utgivelse av programvare', 10),
  ('teknologi-og-it-tjenester', '62', 'IT-tjenester', 20),
  ('teknologi-og-it-tjenester', '63', 'Informasjonstjenester', 30),
  ('finans-forsikring-og-investering', '64', 'Finansieringsvirksomhet', 10),
  ('finans-forsikring-og-investering', '65', 'Forsikring og pensjon', 20),
  ('finans-forsikring-og-investering', '66', 'Tjenester tilknyttet finansiering', 30),
  ('helse-og-omsorg', '86', 'Helsetjenester', 10),
  ('helse-og-omsorg', '87', 'Pleie- og omsorgstjenester i institusjon', 20),
  ('helse-og-omsorg', '88', 'Sosiale omsorgstjenester uten botilbud', 30),
  ('reiseliv-hotell-og-servering', '55', 'Overnattingsvirksomhet', 10),
  ('reiseliv-hotell-og-servering', '56', 'Serveringsvirksomhet', 20),
  ('reiseliv-hotell-og-servering', '79', 'Reisebyra og reisearrangorer', 30),
  ('profesjonelle-tjenester-og-radgivning', '69', 'Juridisk og regnskapsmessig tjenesteyting', 10),
  ('profesjonelle-tjenester-og-radgivning', '70', 'Hovedkontor og administrativ radgivning', 20),
  ('profesjonelle-tjenester-og-radgivning', '71', 'Arkitekt- og teknisk konsulentvirksomhet', 30),
  ('profesjonelle-tjenester-og-radgivning', '73', 'Reklame og markedsundersokelser', 40),
  ('profesjonelle-tjenester-og-radgivning', '78', 'Arbeidskrafttjenester', 50),
  ('media-kultur-og-underholdning', '58.1', 'Forlagsvirksomhet', 10),
  ('media-kultur-og-underholdning', '59', 'Film-, video- og TV-produksjon', 20),
  ('media-kultur-og-underholdning', '60', 'Radio- og fjernsynskringkasting', 30),
  ('media-kultur-og-underholdning', '90', 'Kunstnerisk virksomhet og underholdning', 40),
  ('media-kultur-og-underholdning', '93', 'Sports- og fritidsaktiviteter', 50),
  ('landbruk-skog-og-naturressurser', '01', 'Jordbruk og tjenester tilknyttet jordbruk', 10),
  ('landbruk-skog-og-naturressurser', '02', 'Skogbruk', 20),
  ('landbruk-skog-og-naturressurser', '05', 'Bryting av kull og brunkull', 30),
  ('landbruk-skog-og-naturressurser', '07', 'Bryting av metallholdig malm', 40),
  ('landbruk-skog-og-naturressurser', '08', 'Bergverksdrift ellers', 50)
)
INSERT INTO brreg.fp_bransje_naeringskode (bransje_id, kode_prefix, beskrivelse, sortering)
SELECT b.id, m.kode_prefix, m.beskrivelse, m.sortering
FROM mapping m
JOIN brreg.fp_bransje b ON b.slug = m.slug
ON CONFLICT (bransje_id, kode_prefix) DO UPDATE SET
  beskrivelse = EXCLUDED.beskrivelse,
  sortering = EXCLUDED.sortering;

INSERT INTO brreg.fp_prosess (slug, parent_id, level, sortering, navn, kortnavn, beskrivelse, input, output, roller, kpi)
VALUES
('market-to-lead', NULL, 1, 10, 'Market to Lead', 'M2L', 'Identifiser markeder, segmenter og potensielle kunder for a skape kvalifiserte leads.', 'Markedsdata, segmenter, kampanjeplaner', 'Kvalifiserte leads og prioriterte segmenter', 'Marked, salg, forretningsutvikling', 'Lead-volum, lead-kvalitet, kampanje-ROI'),
('lead-to-quote', NULL, 1, 20, 'Lead to Quote', 'L2Q', 'Konverter behov til tilbud, pris og kommersielle vilkar.', 'Kvalifiserte leads, behov, produkt- og prisdata', 'Tilbud, kontraktsforslag og prognose', 'Salg, presales, juridisk, finance', 'Tilbudsrate, win rate, tilbudstid'),
('order-to-cash', NULL, 1, 30, 'Order to Cash', 'O2C', 'Handter kundeordre fra mottak til levering, faktura og betaling.', 'Kundeordre, avtaler, lagerstatus, kredittdata', 'Leveranse, faktura, innbetaling og avstemt kundefordring', 'Salg, kundeservice, lager, logistikk, finance', 'OTIF, ordrecycle time, DSO, fakturafeil'),
('procure-to-pay', NULL, 1, 40, 'Procure to Pay', 'P2P', 'Planlegg, kjop, motta, kontroller og betal varer og tjenester.', 'Innkjopsbehov, leverandoravtaler, budsjett', 'Mottatte varer/tjenester, bokfort kostnad og betalt leverandor', 'Innkjop, lager, fagavdeling, finance', 'Avtaledekning, leverandor-OTD, fakturamatch, kostnadsavvik'),
('forecast-to-plan', NULL, 1, 50, 'Forecast to Plan', 'F2P', 'Omsett ettersporsel, kapasitet og okonomiske mal til planer.', 'Historikk, pipeline, kapasitet, budsjett', 'Ettersporselsplan, produksjons-/innkjopsplan og scenario', 'Planlegging, salg, supply chain, finance', 'Prognosenoyaktighet, planstabilitet, servicegrad'),
('plan-to-produce', NULL, 1, 60, 'Plan to Produce', 'P2M', 'Planlegg og gjennomfor produksjon fra materialbehov til ferdig vare.', 'Produksjonsplan, BOM/resept, materialer, kapasitet', 'Ferdig vare, produksjonsavvik og kostnadsdata', 'Produksjon, planlegging, kvalitet, vedlikehold', 'OEE, vrak, gjennomlopstid, planoppfyllelse'),
('inventory-to-deliver', NULL, 1, 70, 'Inventory to Deliver', 'I2D', 'Styr lager, plukk, pakk, transport og leveranse til kunde eller lokasjon.', 'Lagerbeholdning, ordre, transportkrav', 'Plukket, pakket og levert forsendelse med sporbar status', 'Lager, logistikk, transport, kundeservice', 'Plukknoyaktighet, lagerdager, OTIF, fraktkost per ordre'),
('service-to-resolution', NULL, 1, 80, 'Service to Resolution', 'S2R', 'Motta, prioriter og los kunde-/servicehenvendelser til ferdig lost sak.', 'Henvendelser, avtaler, garantier, servicehistorikk', 'Lost sak, serviceordre og kundeoppdatering', 'Kundeservice, tekniker, support, produkt', 'Forstelinjelosning, responstid, SLA, NPS'),
('concept-to-launch', NULL, 1, 90, 'Concept to Launch', 'C2L', 'Utvikle nye produkter, tjenester eller konsepter fra ide til lansering.', 'Ideer, markedsbehov, business case', 'Lansert produkt/tjeneste, godkjent masterdata og kommersiell plan', 'Produkt, R&D, salg, kvalitet, supply chain', 'Time-to-market, lanseringspresisjon, portefoljeverdi'),
('maintain-to-operate', NULL, 1, 100, 'Maintain to Operate', 'M2O', 'Sikre drift av anlegg, utstyr og ressurser gjennom vedlikehold og beredskap.', 'Anleggsregister, sensordata, vedlikeholdsplan', 'Tilgjengelige aktiva, lukket arbeidsordre og dokumentert tilstand', 'Drift, vedlikehold, HMS, teknisk', 'Oppetid, MTBF, MTTR, vedlikeholdskost'),
('hire-to-retire', NULL, 1, 110, 'Hire to Retire', 'H2R', 'Handter medarbeiderlivslop fra rekruttering til avslutning.', 'Bemanningsbehov, kandidater, kontrakter', 'Ansatte, kompetanse, timer, lonnsgrunnlag og avsluttet arbeidsforhold', 'HR, leder, payroll, finance', 'Time-to-hire, turnover, sykefravaer, kompetansedekning'),
('financial-plan-to-report', NULL, 1, 120, 'Financial Plan to Report', 'FP2R', 'Planlegg, bokfor, avstem, konsolider og rapporter okonomisk resultat.', 'Budsjett, transaksjoner, masterdata, regelverk', 'Ledelsesrapportering, regnskap, prognose og myndighetsrapportering', 'Finance, controller, ledelse, revisor', 'Closing time, forecast accuracy, avstemmingsavvik, rapporteringsfrist')
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = EXCLUDED.level,
  sortering = EXCLUDED.sortering,
  navn = EXCLUDED.navn,
  kortnavn = EXCLUDED.kortnavn,
  beskrivelse = EXCLUDED.beskrivelse,
  input = EXCLUDED.input,
  output = EXCLUDED.output,
  roller = EXCLUDED.roller,
  kpi = EXCLUDED.kpi,
  aktiv = true,
  oppdatert = now();

WITH l2(parent_slug, slug, sortering, navn, beskrivelse, input, output, roller, kpi) AS (
  VALUES
  ('market-to-lead', 'market-insight', 10, 'Market insight', 'Analyser marked, konkurrenter og segmenter.', 'Markedsdata og kundedata', 'Segmenthypoteser og prioriteringer', 'Marked, analyse', 'Segmentverdi, datadekning'),
  ('market-to-lead', 'campaign-planning', 20, 'Campaign planning', 'Planlegg kampanjer, kanaler og budskap.', 'Segmenter og kampanjemal', 'Kampanjeplan og budsjett', 'Marked, salg', 'Kampanje-ROI, CPL'),
  ('market-to-lead', 'lead-capture', 30, 'Lead capture', 'Fang opp leads fra digitale og manuelle kilder.', 'Kampanjer, events, webskjema', 'Nye leads', 'Marked, SDR', 'Lead-volum, konverteringsrate'),
  ('market-to-lead', 'lead-qualification', 40, 'Lead qualification', 'Scor og kvalifiser leads for salgsoppfolging.', 'Leads og firmadata', 'MQL/SQL', 'SDR, salg', 'MQL til SQL, kvalifiseringstid'),
  ('lead-to-quote', 'opportunity-discovery', 10, 'Opportunity discovery', 'Avklar behov, beslutningstakere og verdi.', 'Lead og kundedialog', 'Kvalifisert mulighet', 'Salg, presales', 'Discovery completion, stage conversion'),
  ('lead-to-quote', 'solution-design', 20, 'Solution design', 'Sett sammen losning, omfang og leveransemodell.', 'Behov, produktdata, kapasitet', 'Losningsforslag', 'Presales, produkt, drift', 'Design cycle time, marginindikasjon'),
  ('lead-to-quote', 'pricing-and-approval', 30, 'Pricing and approval', 'Beregn pris og hent nodvendige godkjenninger.', 'Kost, prisregler, rabattpolicy', 'Godkjent pris', 'Salg, finance, leder', 'Rabattnivaa, approval time'),
  ('lead-to-quote', 'quote-issue', 40, 'Quote issue', 'Send tilbud og styr gyldighet, versjoner og forhandling.', 'Godkjent pris og losning', 'Tilbud/kontrakt', 'Salg, juridisk', 'Quote cycle time, win rate'),
  ('order-to-cash', 'order-capture', 10, 'Order capture', 'Registrer og valider kundeordre.', 'Kundeordre, avtale, kundeinfo', 'Validert ordre', 'Salg, kundeservice', 'Ordrefeil, ordrebehandlingstid'),
  ('order-to-cash', 'credit-and-availability-check', 20, 'Credit and availability check', 'Kontroller kreditt, lager og leveringsmulighet.', 'Validert ordre, kredittdata, ATP', 'Frigitt eller blokkert ordre', 'Finance, kundeservice, lager', 'Kredittblokkeringer, ATP-noyaktighet'),
  ('order-to-cash', 'fulfilment-and-delivery', 30, 'Fulfilment and delivery', 'Plukk, produser eller lever ordre til kunde.', 'Frigitt ordre, lager/produksjon', 'Levert ordre', 'Lager, produksjon, logistikk', 'OTIF, leveringspresisjon'),
  ('order-to-cash', 'billing-and-collection', 40, 'Billing and collection', 'Fakturer, folg opp innbetaling og avstem.', 'Leveranse, pris, kontrakt', 'Faktura, betaling, avstemming', 'Finance, kundeservice', 'DSO, fakturafeil, inkassograd'),
  ('procure-to-pay', 'purchase-requisition', 10, 'Purchase requisition', 'Opprett og godkjenn innkjopsbehov.', 'Behov, budsjett, avtale', 'Godkjent rekvisisjon', 'Fagavdeling, innkjop, leder', 'Approval time, maverick spend'),
  ('procure-to-pay', 'supplier-selection', 20, 'Supplier selection', 'Velg leverandor og kommersielle vilkar.', 'Rekvisisjon, avtaler, leverandordata', 'Valgt leverandor', 'Innkjop, fagavdeling', 'Avtaledekning, savings'),
  ('procure-to-pay', 'purchase-order', 30, 'Purchase order', 'Opprett og send innkjopsordre.', 'Godkjent rekvisisjon og leverandor', 'Sendt PO', 'Innkjop', 'PO cycle time, PO accuracy'),
  ('procure-to-pay', 'receipt-and-invoice-match', 40, 'Receipt and invoice match', 'Motta varer/tjenester og match faktura.', 'PO, pakkseddel, faktura', 'Godkjent faktura', 'Lager, mottak, finance', 'Match rate, avvik per faktura'),
  ('procure-to-pay', 'supplier-payment', 50, 'Supplier payment', 'Betal leverandor og avstem apne poster.', 'Godkjent faktura, betalingsplan', 'Betalt og avstemt leverandorpost', 'Finance', 'Betaling til forfall, cash discount'),
  ('forecast-to-plan', 'demand-forecasting', 10, 'Demand forecasting', 'Lag prognose basert pa historikk, pipeline og marked.', 'Historikk, kampanjer, salgspipeline', 'Ettersporselsprognose', 'Planlegging, salg', 'Forecast accuracy, bias'),
  ('forecast-to-plan', 'capacity-planning', 20, 'Capacity planning', 'Avstem ettersporsel mot kapasitet og begrensninger.', 'Prognose, ressursdata, kapasitet', 'Kapasitetsplan', 'Planlegging, drift', 'Capacity utilization, bottleneck count'),
  ('forecast-to-plan', 'supply-planning', 30, 'Supply planning', 'Sett forsyningsplan for innkjop, produksjon og lager.', 'Prognose, lager, ledetider', 'Forsyningsplan', 'Supply chain, innkjop', 'Servicegrad, lagerdekning'),
  ('forecast-to-plan', 'scenario-review', 40, 'Scenario review', 'Vurder scenarioer og godkjenn plan.', 'Planforslag, finansmal', 'Godkjent plan', 'Ledelse, finance, supply chain', 'Planavvik, scenarioverdi'),
  ('plan-to-produce', 'production-planning', 10, 'Production planning', 'Lag produksjonsplan og prioriter kapasitetsbruk.', 'Ettersporsel, BOM/resept, kapasitet', 'Produksjonsplan', 'Planlegging, produksjon', 'Planoppfyllelse, kapasitetsutnyttelse'),
  ('plan-to-produce', 'material-staging', 20, 'Material staging', 'Sikre at materialer er tilgjengelige for produksjon.', 'Produksjonsplan, lager, innkjop', 'Klargjorte materialer', 'Lager, produksjon', 'Materialtilgjengelighet, stopp pga materialer'),
  ('plan-to-produce', 'production-execution', 30, 'Production execution', 'Gjennomfor produksjonsordre og registrer forbruk/resultat.', 'Klargjorte materialer, arbeidsordre', 'Produsert mengde og avvik', 'Produksjon, kvalitet', 'OEE, vrak, gjennomlopstid'),
  ('plan-to-produce', 'quality-release', 40, 'Quality release', 'Kontroller kvalitet og frigjore ferdig vare.', 'Produserte varer, testdata', 'Frigitt eller sperret vare', 'Kvalitet, produksjon', 'First pass yield, kvalitetsavvik'),
  ('inventory-to-deliver', 'inventory-control', 10, 'Inventory control', 'Styr beholdning, lokasjoner og disponering.', 'Beholdning, transaksjoner, behov', 'Tilgjengelig lagerstatus', 'Lager, supply chain', 'Lagerdager, beholdningsnoyaktighet'),
  ('inventory-to-deliver', 'pick-and-pack', 20, 'Pick and pack', 'Plukk, pakk og klargjor forsendelse.', 'Leveringsordre, plukkliste', 'Pakket forsendelse', 'Lager', 'Plukknoyaktighet, plukk per time'),
  ('inventory-to-deliver', 'transport-booking', 30, 'Transport booking', 'Book transport og generer fraktdokumenter.', 'Forsendelse, transportkrav', 'Transportbestilling og dokumenter', 'Logistikk, transportor', 'Fraktkost, bookingfeil'),
  ('inventory-to-deliver', 'delivery-confirmation', 40, 'Delivery confirmation', 'Bekreft levering og oppdater status.', 'Transportstatus, POD', 'Leveringsbekreftelse', 'Logistikk, kundeservice', 'OTIF, POD coverage'),
  ('service-to-resolution', 'case-intake', 10, 'Case intake', 'Motta og kategoriser henvendelser.', 'E-post, telefon, portal, IoT-varsel', 'Registrert sak', 'Support, kundeservice', 'First response, kanalvolum'),
  ('service-to-resolution', 'triage-and-dispatch', 20, 'Triage and dispatch', 'Prioriter sak og alloker riktig ressurs.', 'Sak, SLA, kompetanse, lokasjon', 'Tildelt sak/serviceordre', 'Supportleder, dispatcher', 'SLA-risk, dispatch time'),
  ('service-to-resolution', 'resolution-work', 30, 'Resolution work', 'Los saken gjennom fjernhjelp, feltservice eller korrigering.', 'Tildelt sak, historikk, deler', 'Lost sak eller eskalering', 'Tekniker, support, produkt', 'MTTR, first-time-fix'),
  ('service-to-resolution', 'closure-and-learning', 40, 'Closure and learning', 'Lukk sak og fang erfaring for forbedring.', 'Lost sak, rotarsak, tilbakemelding', 'Lukket sak og kunnskapsartikkel', 'Support, kvalitet, produkt', 'CSAT, repeat incidents'),
  ('concept-to-launch', 'idea-capture', 10, 'Idea capture', 'Samle og prioritere ideer og markedsbehov.', 'Ideer, kundeinnsikt, regulatorikk', 'Prioritert initiativ', 'Produkt, salg, marked', 'Idekonvertering, portefoljeverdi'),
  ('concept-to-launch', 'business-case', 20, 'Business case', 'Valider verdi, risiko og investering.', 'Initiativ, estimater, markedsdata', 'Godkjent business case', 'Produkt, finance, ledelse', 'NPV, risk score'),
  ('concept-to-launch', 'development-and-validation', 30, 'Development and validation', 'Utvikle, teste og validere produkt/tjeneste.', 'Krav, design, ressurser', 'Validert losning', 'R&D, kvalitet, drift', 'Test pass rate, cycle time'),
  ('concept-to-launch', 'launch-readiness', 40, 'Launch readiness', 'Klargjor masterdata, salg, drift og support for lansering.', 'Validert losning, lanseringsplan', 'Lanseringsklar organisasjon', 'Produkt, salg, supply chain, support', 'Launch readiness, adoption'),
  ('maintain-to-operate', 'asset-register', 10, 'Asset register', 'Etabler og vedlikehold anleggs- og utstyrsregister.', 'Utstyr, lokasjon, kritikalitet', 'Oppdatert aktivaoversikt', 'Drift, teknisk, finance', 'Datakvalitet, dekningsgrad'),
  ('maintain-to-operate', 'maintenance-planning', 20, 'Maintenance planning', 'Planlegg forebyggende og korrigerende vedlikehold.', 'Aktiva, tilstand, intervaller', 'Vedlikeholdsplan', 'Vedlikehold, drift', 'Planlagt vs akutt arbeid'),
  ('maintain-to-operate', 'work-order-execution', 30, 'Work order execution', 'Gjennomfor arbeidsordre med timer, deler og funn.', 'Arbeidsordre, deler, tekniker', 'Fullfort arbeidsordre', 'Tekniker, lager, HMS', 'MTTR, backlog, sikkerhetsavvik'),
  ('maintain-to-operate', 'reliability-improvement', 40, 'Reliability improvement', 'Analyser feil og forbedre driftssikkerhet.', 'Historikk, rotarsak, kost', 'Forbedringstiltak', 'Vedlikehold, engineering, drift', 'MTBF, oppetid, vedlikeholdskost'),
  ('hire-to-retire', 'workforce-planning', 10, 'Workforce planning', 'Planlegg bemanning, roller og kompetansebehov.', 'Strategi, kapasitet, turnover', 'Bemanningsplan', 'HR, ledere, finance', 'Dekningsgrad, kost mot budsjett'),
  ('hire-to-retire', 'recruit-and-onboard', 20, 'Recruit and onboard', 'Rekrutter, ansett og onboard medarbeidere.', 'Kandidater, stillinger, kontrakter', 'Onboardet medarbeider', 'HR, leder, IT', 'Time-to-hire, onboarding completion'),
  ('hire-to-retire', 'time-payroll-and-performance', 30, 'Time, payroll and performance', 'Handter tid, fravaer, lonn og prestasjon.', 'Timer, fravaer, mal, tariff', 'Lonnsgrunnlag og prestasjonsdata', 'HR, payroll, leder', 'Payroll accuracy, sykefravaer'),
  ('hire-to-retire', 'offboarding', 40, 'Offboarding', 'Avslutt arbeidsforhold og sikre kunnskap/tilganger.', 'Oppsigelse, utstyr, tilgangsliste', 'Avsluttet arbeidsforhold', 'HR, leder, IT', 'Offboarding completion, tilgangsavvik'),
  ('financial-plan-to-report', 'budget-and-forecast', 10, 'Budget and forecast', 'Sett budsjett, prognoser og scenarioer.', 'Historikk, mal, driverdata', 'Budsjett og prognose', 'Finance, ledelse, fagomrader', 'Forecast accuracy, budsjettavvik'),
  ('financial-plan-to-report', 'record-to-ledger', 20, 'Record to ledger', 'Bokfor transaksjoner og periodiser riktig.', 'Bilag, ordre, faktura, bank', 'Oppdatert hovedbok', 'Regnskap, finance operations', 'Automatiseringsgrad, bokforingsfeil'),
  ('financial-plan-to-report', 'period-close', 30, 'Period close', 'Avstem, periodiser og lukk perioden.', 'Hovedbok, subledger, avstemminger', 'Lukket periode', 'Controller, regnskap', 'Closing days, apne avvik'),
  ('financial-plan-to-report', 'management-reporting', 40, 'Management reporting', 'Rapporter resultat, kontantstrom og KPI-er.', 'Lukket periode, budsjett, forecast', 'Ledelsesrapport og myndighetsrapportering', 'Finance, ledelse, revisor', 'Rapporteringsfrist, rapportkvalitet')
)
INSERT INTO brreg.fp_prosess (slug, parent_id, level, sortering, navn, beskrivelse, input, output, roller, kpi)
SELECT l2.slug, p.id, 2, l2.sortering, l2.navn, l2.beskrivelse, l2.input, l2.output, l2.roller, l2.kpi
FROM l2
JOIN brreg.fp_prosess p ON p.slug = l2.parent_slug
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = EXCLUDED.level,
  sortering = EXCLUDED.sortering,
  navn = EXCLUDED.navn,
  beskrivelse = EXCLUDED.beskrivelse,
  input = EXCLUDED.input,
  output = EXCLUDED.output,
  roller = EXCLUDED.roller,
  kpi = EXCLUDED.kpi,
  aktiv = true,
  oppdatert = now();

WITH l3(parent_slug, slug, sortering, navn, beskrivelse, input, output, roller, kpi) AS (
  VALUES
  ('order-capture', 'receive-customer-order', 10, 'Receive customer order', 'Motta ordre fra portal, EDI, salg eller kundeservice.', 'Bestilling og kundedata', 'Opprettet ordreutkast', 'Kundeservice, salg', 'Ordrekanalmiks, manuelle feil'),
  ('order-capture', 'validate-order-masterdata', 20, 'Validate order masterdata', 'Valider kunde, vare, pris, leveringsadresse og avgifter.', 'Ordreutkast og masterdata', 'Validert ordre', 'Kundeservice, masterdata', 'Ordrefeil, valideringsavvik'),
  ('order-capture', 'confirm-order', 30, 'Confirm order', 'Bekreft ordre og forventet levering til kunde.', 'Validert ordre og ATP', 'Ordrebekreftelse', 'Kundeservice', 'Bekreftelsestid'),
  ('credit-and-availability-check', 'credit-check', 10, 'Credit check', 'Kontroller kredittgrense, betalingshistorikk og sperrer.', 'Kunde, ordreverdi, apne poster', 'Kredittstatus', 'Finance', 'Kredittblokkeringer, tapsrisiko'),
  ('credit-and-availability-check', 'availability-promise', 20, 'Availability promise', 'Beregn tilgjengelighet og lovet leveringsdato.', 'Lager, innkjop, produksjonsplan', 'Lovet leveringsdato', 'Supply chain', 'ATP-noyaktighet, servicegrad'),
  ('fulfilment-and-delivery', 'release-for-fulfilment', 10, 'Release for fulfilment', 'Frigi ordre til lager, produksjon eller direkteleveranse.', 'Frigitt kreditt og tilgjengelighet', 'Leveringsordre', 'Kundeservice, lager', 'Frigivelsestid'),
  ('fulfilment-and-delivery', 'ship-or-deliver', 20, 'Ship or deliver', 'Send varer eller bekreft levert tjeneste.', 'Leveringsordre, transport', 'Levert ordre', 'Lager, logistikk, drift', 'OTIF, transportavvik'),
  ('billing-and-collection', 'invoice-customer', 10, 'Invoice customer', 'Generer og send korrekt faktura.', 'Leveranse, pris, avgift, kontrakt', 'Sendt faktura', 'Regnskap, kundeservice', 'Fakturafeil, fakturatid'),
  ('billing-and-collection', 'collect-payment', 20, 'Collect payment', 'Folg opp betaling, purring og innbetaling.', 'Faktura, betalingsbetingelser', 'Innbetaling', 'Finance', 'DSO, forfalte poster'),
  ('billing-and-collection', 'reconcile-receivable', 30, 'Reconcile receivable', 'Match innbetaling og avstem kundefordring.', 'Bank, reskontro, faktura', 'Avstemt kundefordring', 'Regnskap', 'Umatchede innbetalinger'),
  ('purchase-requisition', 'identify-purchase-need', 10, 'Identify purchase need', 'Oppdag behov fra lager, prosjekt, produksjon eller drift.', 'Behov, min/max, prosjektplan', 'Innkjopsbehov', 'Fagavdeling, lager', 'Behov til rekvisisjon'),
  ('purchase-requisition', 'approve-requisition', 20, 'Approve requisition', 'Godkjenn behov mot budsjett, policy og fullmakt.', 'Rekvisisjon, budsjett', 'Godkjent rekvisisjon', 'Leder, finance', 'Approval time, avvisningsrate'),
  ('purchase-order', 'create-purchase-order', 10, 'Create purchase order', 'Opprett PO med vare, pris, leveringssted og vilkar.', 'Godkjent rekvisisjon', 'PO-kladd', 'Innkjop', 'PO accuracy'),
  ('purchase-order', 'send-purchase-order', 20, 'Send purchase order', 'Send PO og fang ordrebekreftelse.', 'Godkjent PO', 'Bekreftet PO', 'Innkjop, leverandor', 'Supplier confirmation time'),
  ('receipt-and-invoice-match', 'receive-goods', 10, 'Receive goods', 'Registrer varemottak og avvik.', 'PO, pakkseddel, leveranse', 'Varemottak', 'Mottak, lager', 'Mottaksavvik, mottakstid'),
  ('receipt-and-invoice-match', 'service-entry', 20, 'Service entry', 'Bekreft leverte tjenester for fakturamatch.', 'PO, timeliste/leveransebevis', 'Godkjent tjenestemottak', 'Fagavdeling', 'Ubekreftede tjenester'),
  ('receipt-and-invoice-match', 'three-way-match', 30, 'Three-way match', 'Match PO, mottak og faktura for automatisk godkjenning.', 'PO, mottak, faktura', 'Godkjent eller avviksmarkert faktura', 'AP, innkjop', 'Touchless match rate'),
  ('supplier-payment', 'payment-run', 10, 'Payment run', 'Planlegg og gjennomfor betalingsforslag.', 'Godkjente fakturaer, bank', 'Sendt betaling', 'Finance', 'Betaling til forfall'),
  ('supplier-payment', 'supplier-reconciliation', 20, 'Supplier reconciliation', 'Avstem leverandorreskontro og handter avvik.', 'Betalinger, fakturaer, kreditnotaer', 'Avstemt leverandorpost', 'Regnskap', 'Uavklarte poster'),
  ('production-planning', 'create-master-production-schedule', 10, 'Create production schedule', 'Bryt plan ned til produksjonsordre og kapasitetsbehov.', 'Ettersporsel, lager, kapasitet', 'Produksjonsprogram', 'Planlegger', 'Planstabilitet'),
  ('production-planning', 'sequence-production', 20, 'Sequence production', 'Sekvenser ordre for setup, kapasitet og prioritet.', 'Produksjonsprogram, begrensninger', 'Sekvensert plan', 'Planlegging, produksjon', 'Setup-tid, planoppfyllelse'),
  ('material-staging', 'reserve-materials', 10, 'Reserve materials', 'Reserver materialer og komponenter til produksjon.', 'BOM/resept, beholdning', 'Materialreservasjon', 'Lager, planlegging', 'Materialdekning'),
  ('material-staging', 'stage-materials-to-line', 20, 'Stage materials to line', 'Flytt og klargjor materialer ved linje/arbeidsplass.', 'Reservasjon, plukkliste', 'Klargjort materialsett', 'Lager, produksjon', 'Linjestopp pga materialer'),
  ('production-execution', 'release-production-order', 10, 'Release production order', 'Frigi produksjonsordre med riktig versjon og dokumentasjon.', 'Sekvensert plan, materialstatus', 'Frigitt produksjonsordre', 'Planlegging, produksjon', 'Frigivelsesavvik'),
  ('production-execution', 'confirm-operations', 20, 'Confirm operations', 'Registrer operasjoner, forbruk, tid og ferdigmelding.', 'Produksjonsordre, materialer', 'Operasjonsbekreftelser', 'Produksjon', 'OEE, rapporteringsgrad'),
  ('production-execution', 'capture-production-variance', 30, 'Capture production variance', 'Fang vrak, svinn, stopp og kostnadsavvik.', 'Produksjonsdata, kvalitet', 'Avviksdata', 'Produksjon, controller', 'Vrakrate, kostnadsavvik'),
  ('quality-release', 'quality-inspection', 10, 'Quality inspection', 'Gjennomfor inspeksjon, test eller laboratoriekontroll.', 'Testplan, prove, batch/ordre', 'Testresultat', 'Kvalitet', 'First pass yield'),
  ('quality-release', 'release-finished-goods', 20, 'Release finished goods', 'Frigjor, sperr eller omarbeid ferdig vare.', 'Testresultat, avvik', 'Frigitt beholdning', 'Kvalitet, lager', 'Sperret lager, release time'),
  ('inventory-control', 'cycle-counting', 10, 'Cycle counting', 'Tell og korriger beholdning etter plan eller avvik.', 'Lagerstatus, telleplan', 'Korrigert beholdning', 'Lager', 'Inventory accuracy'),
  ('inventory-control', 'replenishment-control', 20, 'Replenishment control', 'Overvak min/max, sikkerhetslager og disponering.', 'Beholdning, ettersporsel, ledetid', 'Påfyllingsforslag', 'Supply chain', 'Stockout, lagerdager'),
  ('pick-and-pack', 'wave-or-pick-release', 10, 'Wave or pick release', 'Batch og frigi plukk etter prioritet, rute eller cut-off.', 'Leveringsordre, lagerstatus', 'Plukkliste', 'Lagerleder', 'Wave completion'),
  ('pick-and-pack', 'pack-and-label', 20, 'Pack and label', 'Pakk, merk og dokumenter forsendelse.', 'Plukkede varer, emballasjekrav', 'Pakket kolli', 'Lager', 'Pakkefeil, kolli per time'),
  ('transport-booking', 'select-carrier', 10, 'Select carrier', 'Velg transportor basert pa pris, SLA og kapasitet.', 'Forsendelse, rater, avtaler', 'Valgt transportor', 'Logistikk', 'Fraktkost, carrier performance'),
  ('delivery-confirmation', 'proof-of-delivery', 10, 'Proof of delivery', 'Motta POD og lukk leveranse.', 'Transportstatus, mottakskvittering', 'Bekreftet levering', 'Logistikk, kundeservice', 'POD coverage, leveringsavvik'),
  ('budget-and-forecast', 'collect-budget-input', 10, 'Collect budget input', 'Samle budsjettinput fra enheter og drivere.', 'Driverdata, mal, historikk', 'Budsjettinnspill', 'Finance, fagomrader', 'Innsendingsgrad'),
  ('budget-and-forecast', 'consolidate-forecast', 20, 'Consolidate forecast', 'Konsolider prognoser og scenarioer.', 'Budsjettinnspill, pipeline, faktisk', 'Konsolidert forecast', 'Controller, finance', 'Forecast accuracy'),
  ('record-to-ledger', 'post-subledger-transactions', 10, 'Post subledger transactions', 'Overfor transaksjoner fra ordre, lager, bank og reskontro.', 'Subledger-transaksjoner', 'Bokfort hovedbok', 'Regnskap', 'Interface errors'),
  ('record-to-ledger', 'manual-journal-entry', 20, 'Manual journal entry', 'Registrer og godkjenn manuelle bilag.', 'Bilagsgrunnlag, fullmakt', 'Bokfort bilag', 'Regnskap, controller', 'Manuelle bilag, godkjenningstid'),
  ('period-close', 'subledger-close', 10, 'Subledger close', 'Lukk reskontro, lager og andre subledgers.', 'Subledger-status, avvik', 'Lukket subledger', 'AP, AR, lager, regnskap', 'Open items, close readiness'),
  ('period-close', 'account-reconciliation', 20, 'Account reconciliation', 'Avstem balanseposter og dokumenter differanser.', 'Hovedbok, kontoutdrag, subledger', 'Godkjent avstemming', 'Regnskap, controller', 'Avstemmingsavvik'),
  ('period-close', 'close-period', 30, 'Close period', 'Lukk periode og sperr for uautoriserte posteringer.', 'Avstemminger, periodiseringer', 'Lukket periode', 'Controller, regnskapssjef', 'Closing days'),
  ('management-reporting', 'generate-management-pack', 10, 'Generate management pack', 'Lag rapportpakke for ledelse og styre.', 'Lukket periode, KPI, budsjett', 'Rapportpakke', 'Finance, BI', 'Rapporteringsfrist'),
  ('management-reporting', 'statutory-reporting', 20, 'Statutory reporting', 'Utarbeid myndighets- og regnskapsrapportering.', 'Regnskap, regelverk, kontoplan', 'Lovpabudt rapportering', 'Regnskap, revisor', 'Compliance avvik')
)
INSERT INTO brreg.fp_prosess (slug, parent_id, level, sortering, navn, beskrivelse, input, output, roller, kpi)
SELECT l3.slug, p.id, 3, l3.sortering, l3.navn, l3.beskrivelse, l3.input, l3.output, l3.roller, l3.kpi
FROM l3
JOIN brreg.fp_prosess p ON p.slug = l3.parent_slug
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = EXCLUDED.level,
  sortering = EXCLUDED.sortering,
  navn = EXCLUDED.navn,
  beskrivelse = EXCLUDED.beskrivelse,
  input = EXCLUDED.input,
  output = EXCLUDED.output,
  roller = EXCLUDED.roller,
  kpi = EXCLUDED.kpi,
  aktiv = true,
  oppdatert = now();

WITH l4(parent_slug, slug, sortering, navn, beskrivelse, input, output, roller, kpi) AS (
  VALUES
  ('invoice-customer', 'invoice-data-validation', 10, 'Invoice data validation', 'Valider pris, avgift, leveranse og fakturaadresse for fakturering.', 'Leveranse, pris, avgiftskode, kunde', 'Fakturaklar ordre', 'Regnskap, kundeservice', 'Fakturablokkeringer'),
  ('invoice-customer', 'invoice-dispatch', 20, 'Invoice dispatch', 'Send faktura via EHF, e-post eller annen kanal og logg status.', 'Fakturaklar ordre', 'Sendt faktura', 'Regnskap', 'EHF-andel, utsendingsfeil'),
  ('receive-goods', 'goods-receipt-registration', 10, 'Goods receipt registration', 'Registrer mottatt mengde, lokasjon og batch/serie ved behov.', 'PO, pakkseddel, fysisk mottak', 'Registrert varemottak', 'Mottak, lager', 'Mottakstid, mengdeavvik'),
  ('receive-goods', 'receipt-quality-hold', 20, 'Receipt quality hold', 'Sett varer pa kvalitetskontroll eller sperret lager ved avvik.', 'Varemottak, kvalitetsregler', 'Frigitt eller sperret mottak', 'Mottak, kvalitet', 'Sperret mottak, avvik'),
  ('release-production-order', 'print-or-issue-shop-papers', 10, 'Issue shop papers', 'Utsted arbeidsinstruks, etiketter og produksjonsdokumentasjon.', 'Frigitt produksjonsordre', 'Produksjonsdokumentasjon', 'Planlegging, produksjon', 'Dokumentfeil'),
  ('confirm-operations', 'backflush-materials', 10, 'Backflush materials', 'Bokfor standard materialforbruk automatisk ved operasjonsbekreftelse.', 'Operasjonsbekreftelse, BOM/resept', 'Bokfort materialforbruk', 'Produksjon, lager', 'Forbruksavvik'),
  ('subledger-close', 'accounts-payable-close', 10, 'Accounts payable close', 'Lukk leverandorreskontro og handter apne avvik.', 'AP-poster, betalinger, fakturaavvik', 'Lukket AP', 'AP, regnskap', 'Apne AP-avvik'),
  ('subledger-close', 'accounts-receivable-close', 20, 'Accounts receivable close', 'Lukk kundereskontro og vurder tapsavsetninger.', 'AR-poster, betalinger, purringer', 'Lukket AR', 'AR, regnskap', 'Forfalte poster'),
  ('account-reconciliation', 'bank-reconciliation', 10, 'Bank reconciliation', 'Match banktransaksjoner mot hovedbok og reskontro.', 'Bankfil, hovedbok, reskontro', 'Avstemt bank', 'Regnskap', 'Umatchede bankposter'),
  ('close-period', 'period-lock', 10, 'Period lock', 'Sperr perioden etter godkjent close for a bevare rapporteringsgrunnlag.', 'Godkjent close-sjekkliste', 'Sperret periode', 'Regnskapssjef, controller', 'Etterposteringer')
)
INSERT INTO brreg.fp_prosess (slug, parent_id, level, sortering, navn, beskrivelse, input, output, roller, kpi)
SELECT l4.slug, p.id, 4, l4.sortering, l4.navn, l4.beskrivelse, l4.input, l4.output, l4.roller, l4.kpi
FROM l4
JOIN brreg.fp_prosess p ON p.slug = l4.parent_slug
ON CONFLICT (slug) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  level = EXCLUDED.level,
  sortering = EXCLUDED.sortering,
  navn = EXCLUDED.navn,
  beskrivelse = EXCLUDED.beskrivelse,
  input = EXCLUDED.input,
  output = EXCLUDED.output,
  roller = EXCLUDED.roller,
  kpi = EXCLUDED.kpi,
  aktiv = true,
  oppdatert = now();

WITH bransje_l1(bransje_slug, prosess_slug, sortering, relevans) AS (
  VALUES
  ('distribusjon-og-engros', 'market-to-lead', 10, 'core'),
  ('distribusjon-og-engros', 'lead-to-quote', 20, 'core'),
  ('distribusjon-og-engros', 'order-to-cash', 30, 'core'),
  ('distribusjon-og-engros', 'procure-to-pay', 40, 'core'),
  ('distribusjon-og-engros', 'forecast-to-plan', 50, 'core'),
  ('distribusjon-og-engros', 'inventory-to-deliver', 60, 'core'),
  ('distribusjon-og-engros', 'financial-plan-to-report', 70, 'support'),
  ('retail-og-netthandel', 'market-to-lead', 10, 'core'),
  ('retail-og-netthandel', 'order-to-cash', 20, 'core'),
  ('retail-og-netthandel', 'procure-to-pay', 30, 'core'),
  ('retail-og-netthandel', 'forecast-to-plan', 40, 'core'),
  ('retail-og-netthandel', 'inventory-to-deliver', 50, 'core'),
  ('retail-og-netthandel', 'service-to-resolution', 60, 'core'),
  ('retail-og-netthandel', 'financial-plan-to-report', 70, 'support'),
  ('mat-drikke-og-sjomat', 'forecast-to-plan', 10, 'core'),
  ('mat-drikke-og-sjomat', 'plan-to-produce', 20, 'core'),
  ('mat-drikke-og-sjomat', 'inventory-to-deliver', 30, 'core'),
  ('mat-drikke-og-sjomat', 'order-to-cash', 40, 'core'),
  ('mat-drikke-og-sjomat', 'procure-to-pay', 50, 'core'),
  ('mat-drikke-og-sjomat', 'concept-to-launch', 60, 'differentiating'),
  ('mat-drikke-og-sjomat', 'financial-plan-to-report', 70, 'support'),
  ('industriell-produksjon', 'forecast-to-plan', 10, 'core'),
  ('industriell-produksjon', 'plan-to-produce', 20, 'core'),
  ('industriell-produksjon', 'procure-to-pay', 30, 'core'),
  ('industriell-produksjon', 'inventory-to-deliver', 40, 'core'),
  ('industriell-produksjon', 'order-to-cash', 50, 'core'),
  ('industriell-produksjon', 'maintain-to-operate', 60, 'core'),
  ('industriell-produksjon', 'financial-plan-to-report', 70, 'support'),
  ('kjemi-og-prosessindustri', 'concept-to-launch', 10, 'differentiating'),
  ('kjemi-og-prosessindustri', 'forecast-to-plan', 20, 'core'),
  ('kjemi-og-prosessindustri', 'plan-to-produce', 30, 'core'),
  ('kjemi-og-prosessindustri', 'procure-to-pay', 40, 'core'),
  ('kjemi-og-prosessindustri', 'inventory-to-deliver', 50, 'core'),
  ('kjemi-og-prosessindustri', 'maintain-to-operate', 60, 'core'),
  ('kjemi-og-prosessindustri', 'financial-plan-to-report', 70, 'support'),
  ('maskiner-utstyr-og-maritim-teknologi', 'lead-to-quote', 10, 'core'),
  ('maskiner-utstyr-og-maritim-teknologi', 'plan-to-produce', 20, 'core'),
  ('maskiner-utstyr-og-maritim-teknologi', 'procure-to-pay', 30, 'core'),
  ('maskiner-utstyr-og-maritim-teknologi', 'inventory-to-deliver', 40, 'core'),
  ('maskiner-utstyr-og-maritim-teknologi', 'service-to-resolution', 50, 'differentiating'),
  ('maskiner-utstyr-og-maritim-teknologi', 'maintain-to-operate', 60, 'core'),
  ('maskiner-utstyr-og-maritim-teknologi', 'financial-plan-to-report', 70, 'support'),
  ('bygg-og-anlegg', 'lead-to-quote', 10, 'core'),
  ('bygg-og-anlegg', 'procure-to-pay', 20, 'core'),
  ('bygg-og-anlegg', 'forecast-to-plan', 30, 'support'),
  ('bygg-og-anlegg', 'inventory-to-deliver', 40, 'support'),
  ('bygg-og-anlegg', 'maintain-to-operate', 50, 'core'),
  ('bygg-og-anlegg', 'hire-to-retire', 60, 'core'),
  ('bygg-og-anlegg', 'financial-plan-to-report', 70, 'core'),
  ('eiendom-og-facility', 'market-to-lead', 10, 'core'),
  ('eiendom-og-facility', 'lead-to-quote', 20, 'core'),
  ('eiendom-og-facility', 'service-to-resolution', 30, 'core'),
  ('eiendom-og-facility', 'maintain-to-operate', 40, 'core'),
  ('eiendom-og-facility', 'procure-to-pay', 50, 'support'),
  ('eiendom-og-facility', 'financial-plan-to-report', 60, 'core'),
  ('energi-kraft-og-fornybar', 'forecast-to-plan', 10, 'core'),
  ('energi-kraft-og-fornybar', 'maintain-to-operate', 20, 'core'),
  ('energi-kraft-og-fornybar', 'procure-to-pay', 30, 'core'),
  ('energi-kraft-og-fornybar', 'service-to-resolution', 40, 'support'),
  ('energi-kraft-og-fornybar', 'financial-plan-to-report', 50, 'core'),
  ('olje-gass-og-offshore-service', 'lead-to-quote', 10, 'core'),
  ('olje-gass-og-offshore-service', 'procure-to-pay', 20, 'core'),
  ('olje-gass-og-offshore-service', 'plan-to-produce', 30, 'support'),
  ('olje-gass-og-offshore-service', 'inventory-to-deliver', 40, 'core'),
  ('olje-gass-og-offshore-service', 'maintain-to-operate', 50, 'core'),
  ('olje-gass-og-offshore-service', 'financial-plan-to-report', 60, 'core'),
  ('transport-logistikk-og-shipping', 'order-to-cash', 10, 'core'),
  ('transport-logistikk-og-shipping', 'procure-to-pay', 20, 'core'),
  ('transport-logistikk-og-shipping', 'forecast-to-plan', 30, 'core'),
  ('transport-logistikk-og-shipping', 'inventory-to-deliver', 40, 'core'),
  ('transport-logistikk-og-shipping', 'maintain-to-operate', 50, 'core'),
  ('transport-logistikk-og-shipping', 'financial-plan-to-report', 60, 'support'),
  ('teknologi-og-it-tjenester', 'market-to-lead', 10, 'core'),
  ('teknologi-og-it-tjenester', 'lead-to-quote', 20, 'core'),
  ('teknologi-og-it-tjenester', 'order-to-cash', 30, 'core'),
  ('teknologi-og-it-tjenester', 'service-to-resolution', 40, 'core'),
  ('teknologi-og-it-tjenester', 'concept-to-launch', 50, 'differentiating'),
  ('teknologi-og-it-tjenester', 'hire-to-retire', 60, 'support'),
  ('teknologi-og-it-tjenester', 'financial-plan-to-report', 70, 'core'),
  ('finans-forsikring-og-investering', 'market-to-lead', 10, 'core'),
  ('finans-forsikring-og-investering', 'lead-to-quote', 20, 'core'),
  ('finans-forsikring-og-investering', 'order-to-cash', 30, 'core'),
  ('finans-forsikring-og-investering', 'service-to-resolution', 40, 'core'),
  ('finans-forsikring-og-investering', 'financial-plan-to-report', 50, 'core'),
  ('finans-forsikring-og-investering', 'hire-to-retire', 60, 'support'),
  ('helse-og-omsorg', 'lead-to-quote', 10, 'support'),
  ('helse-og-omsorg', 'service-to-resolution', 20, 'core'),
  ('helse-og-omsorg', 'procure-to-pay', 30, 'core'),
  ('helse-og-omsorg', 'forecast-to-plan', 40, 'core'),
  ('helse-og-omsorg', 'hire-to-retire', 50, 'core'),
  ('helse-og-omsorg', 'financial-plan-to-report', 60, 'support'),
  ('reiseliv-hotell-og-servering', 'market-to-lead', 10, 'core'),
  ('reiseliv-hotell-og-servering', 'lead-to-quote', 20, 'core'),
  ('reiseliv-hotell-og-servering', 'order-to-cash', 30, 'core'),
  ('reiseliv-hotell-og-servering', 'procure-to-pay', 40, 'core'),
  ('reiseliv-hotell-og-servering', 'forecast-to-plan', 50, 'core'),
  ('reiseliv-hotell-og-servering', 'service-to-resolution', 60, 'core'),
  ('reiseliv-hotell-og-servering', 'financial-plan-to-report', 70, 'support'),
  ('profesjonelle-tjenester-og-radgivning', 'market-to-lead', 10, 'core'),
  ('profesjonelle-tjenester-og-radgivning', 'lead-to-quote', 20, 'core'),
  ('profesjonelle-tjenester-og-radgivning', 'order-to-cash', 30, 'core'),
  ('profesjonelle-tjenester-og-radgivning', 'hire-to-retire', 40, 'core'),
  ('profesjonelle-tjenester-og-radgivning', 'financial-plan-to-report', 50, 'support'),
  ('media-kultur-og-underholdning', 'market-to-lead', 10, 'core'),
  ('media-kultur-og-underholdning', 'concept-to-launch', 20, 'core'),
  ('media-kultur-og-underholdning', 'lead-to-quote', 30, 'support'),
  ('media-kultur-og-underholdning', 'order-to-cash', 40, 'core'),
  ('media-kultur-og-underholdning', 'service-to-resolution', 50, 'support'),
  ('media-kultur-og-underholdning', 'financial-plan-to-report', 60, 'support'),
  ('landbruk-skog-og-naturressurser', 'forecast-to-plan', 10, 'core'),
  ('landbruk-skog-og-naturressurser', 'plan-to-produce', 20, 'core'),
  ('landbruk-skog-og-naturressurser', 'procure-to-pay', 30, 'core'),
  ('landbruk-skog-og-naturressurser', 'inventory-to-deliver', 40, 'core'),
  ('landbruk-skog-og-naturressurser', 'maintain-to-operate', 50, 'core'),
  ('landbruk-skog-og-naturressurser', 'financial-plan-to-report', 60, 'support')
)
INSERT INTO brreg.fp_bransje_prosess (bransje_id, prosess_id, sortering, relevans)
SELECT b.id, p.id, bp.sortering, bp.relevans
FROM bransje_l1 bp
JOIN brreg.fp_bransje b ON b.slug = bp.bransje_slug
JOIN brreg.fp_prosess p ON p.slug = bp.prosess_slug
ON CONFLICT (bransje_id, prosess_id) DO UPDATE SET
  sortering = EXCLUDED.sortering,
  relevans = EXCLUDED.relevans;

-- SQL-verifisering:
-- select slug, count(*) from brreg.fp_bransje group by slug having count(*) > 1;
-- select * from brreg.fp_prosess where level not between 1 and 4 or (level = 1 and parent_id is not null) or (level > 1 and parent_id is null);
-- select p.* from brreg.fp_prosess p left join brreg.fp_prosess parent on parent.id = p.parent_id where p.level > 1 and parent.id is null;
-- select b.slug from brreg.fp_bransje b left join brreg.fp_bransje_naeringskode n on n.bransje_id = b.id left join brreg.fp_bransje_prosess bp on bp.bransje_id = b.id group by b.slug having count(distinct n.id) = 0 or count(distinct bp.prosess_id) = 0;
