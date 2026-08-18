-- ============================================================
-- brreg datavarehus – komplett oppsett (idempotent).
-- Generert i validert rekkefølge. Kjør én gang mot et nytt prosjekt.
-- Etter datainnlasting: REFRESH MATERIALIZED VIEW for mv_* (se dashboard.sql).
-- ============================================================

-- ===================== db/schema.sql =====================
-- Skjema for brreg-enhetsregisteret i PostgreSQL / Supabase.
-- Alle objekter ligger i et dedikert schema `brreg` (adskilt fra `public`,
-- som i Supabase kan inneholde andre apper). Kjøres idempotent.

CREATE SCHEMA IF NOT EXISTS brreg;

-- Standard søkesti for postgres-rollen: ukvalifiserte tabellnavn (som Hop bruker)
-- løses mot `brreg` først, deretter `public`. Gjør at Hop skriver til brreg-schemaet
-- uten å måtte kvalifisere hver tabell eller sette currentSchema i tilkoblingen.
-- (Krever superbruker; kjøres via Management API / som postgres.)
ALTER ROLE postgres IN DATABASE postgres SET search_path = brreg, public;

CREATE TABLE IF NOT EXISTS brreg.enheter (
    organisasjonsnummer              TEXT PRIMARY KEY,
    navn                             TEXT,
    organisasjonsform_kode           TEXT,
    organisasjonsform_beskrivelse    TEXT,
    naeringskode1                    TEXT,
    naeringskode1_beskrivelse        TEXT,
    naeringskode2                    TEXT,
    naeringskode2_beskrivelse        TEXT,
    antall_ansatte                   INTEGER,
    stiftelsesdato                   DATE,
    registreringsdato                DATE,
    hjemmeside                       TEXT,
    epostadresse                     TEXT,
    forr_adresse                     TEXT,
    forr_postnummer                  TEXT,
    forr_poststed                    TEXT,
    forr_kommune                     TEXT,
    forr_kommunenummer               TEXT,
    forr_land                        TEXT,
    post_adresse                     TEXT,
    post_postnummer                  TEXT,
    post_poststed                    TEXT,
    registrert_mva                   BOOLEAN,
    registrert_foretaksreg           BOOLEAN,
    konkurs                          BOOLEAN,
    under_avvikling                  BOOLEAN,
    overordnet_enhet                 TEXT,
    institusjonell_sektor_kode       TEXT,
    institusjonell_sektor_beskrivelse TEXT,
    sist_oppdatert                   TEXT,
    slettedato                       DATE,
    oppdateringsid                   BIGINT,
    hentet_dato                      TIMESTAMPTZ DEFAULT now()
);

-- Watermark/sync-tilstand: hvilken oppdateringsid vi har lastet til og med.
CREATE TABLE IF NOT EXISTS brreg.sync_status (
    nokkel       TEXT PRIMARY KEY,
    verdi        TEXT,
    sist_kjoert  TIMESTAMPTZ
);

-- Legg til kolonner på en eventuell eksisterende enheter-tabell (eldre oppsett).
ALTER TABLE brreg.enheter ADD COLUMN IF NOT EXISTS slettedato DATE;
ALTER TABLE brreg.enheter ADD COLUMN IF NOT EXISTS oppdateringsid BIGINT;
ALTER TABLE brreg.enheter ADD COLUMN IF NOT EXISTS hentet_dato TIMESTAMPTZ DEFAULT now();

-- Indeks som brukes for å finne neste delta-batch raskt.
CREATE INDEX IF NOT EXISTS idx_enheter_oppdateringsid ON brreg.enheter (oppdateringsid);

-- Seed watermark hvis den ikke finnes (verdi 0 = hent alt fra start).
INSERT INTO brreg.sync_status (nokkel, verdi, sist_kjoert)
VALUES ('enheter_oppdateringsid', '0', NULL)
ON CONFLICT (nokkel) DO NOTHING;

-- ============================================================
-- Regnskap (årsregnskap-nøkkeltall, hentet per organisasjonsnummer)
-- ============================================================
CREATE TABLE IF NOT EXISTS brreg.regnskap (
    id                              BIGINT PRIMARY KEY,
    organisasjonsnummer             TEXT,
    journalnr                       TEXT,
    regnskapstype                   TEXT,
    organisasjonsform               TEXT,
    morselskap                      BOOLEAN,
    regnskapsperiode_fra            DATE,
    regnskapsperiode_til            DATE,
    valuta                          TEXT,
    avviklingsregnskap              BOOLEAN,
    oppstillingsplan                TEXT,
    revisjon_ikke_revidert          BOOLEAN,
    revisjon_fravalg                BOOLEAN,
    smaa_foretak                    BOOLEAN,
    regnskapsregler                 TEXT,
    sum_eiendeler                   NUMERIC,
    sum_omloepsmidler               NUMERIC,
    sum_anleggsmidler               NUMERIC,
    sum_egenkapital_gjeld           NUMERIC,
    sum_egenkapital                 NUMERIC,
    sum_gjeld                       NUMERIC,
    sum_kortsiktig_gjeld            NUMERIC,
    sum_langsiktig_gjeld            NUMERIC,
    sum_driftsinntekter             NUMERIC,
    sum_driftskostnad               NUMERIC,
    driftsresultat                  NUMERIC,
    sum_finansinntekter             NUMERIC,
    sum_finanskostnad               NUMERIC,
    netto_finans                    NUMERIC,
    ordinaert_resultat_foer_skatt   NUMERIC,
    aarsresultat                    NUMERIC,
    hentet_dato                     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_regnskap_orgnr ON brreg.regnskap (organisasjonsnummer);

-- ===================== db/aksjonaerer.sql =====================
-- Aksjonærer (eierposter) – kombinert tabell på tvers av år, som appen søker mot.
-- Kilde: Skatteetatens aksjonærregister (årlig). Rå årsfiler lastes til
-- brreg.aksjonaerer_<år> (én pr. år); denne kombinerte tabellen fylles/oppdateres
-- av aksjonær-loaderen. Definisjonen her sikrer at views/indekser bygger selv om
-- data ikke er lastet ennå. Kjøres idempotent.
CREATE TABLE IF NOT EXISTS brreg.aksjonaerer (
    aar               INTEGER,
    orgnr             TEXT,
    selskap           TEXT,
    aksjonaer_navn    TEXT,
    fodselsaar_orgnr  TEXT,
    antall_aksjer     BIGINT
);

-- ===================== db/sok.sql =====================
-- Deduplisert søke-tabell for aksjonær/person-navn, med trigram-indeks for
-- substring-søk (finner etternavn midt i "FORNAVN ETTERNAVN", ikke bare prefiks).
-- Inneholder distinkte (navn, fødselsår) fra både aksjonærregisteret og
-- skattelista. Bygges per partisjon for å unngå stor temp-spill på disk.
--
-- Rebygg etter ny datainnlasting (se tools/ for praktisk kjøring).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP TABLE IF EXISTS brreg.sok_navn;
CREATE TABLE brreg.sok_navn (
    navn         TEXT,
    fodselsaar   TEXT,
    er_aksjonaer BOOLEAN DEFAULT true
);
CREATE UNIQUE INDEX uq_sok_navn ON brreg.sok_navn (navn, fodselsaar);

-- Fyll per år-partisjon (idempotent), så skatteliste-navn på toppen:
-- DO $$ BEGIN FOR y IN 2005..2026 LOOP
--   EXECUTE format('insert into brreg.sok_navn (navn,fodselsaar)
--     select distinct aksjonaer_navn, fodselsaar_orgnr from brreg.aksjonaerer_%s
--     on conflict (navn,fodselsaar) do nothing;', y);
-- END LOOP; END $$;
-- INSERT INTO brreg.sok_navn (navn,fodselsaar,er_aksjonaer)
--   SELECT DISTINCT navn_upper, fodselsaar::text, false FROM brreg.skatteliste
--   WHERE navn_upper IS NOT NULL ON CONFLICT (navn,fodselsaar) DO NOTHING;

-- Trigram-indeks for raskt substring-søk (LIKE '%term%').
CREATE INDEX IF NOT EXISTS ix_sok_navn_trgm ON brreg.sok_navn USING gin (navn gin_trgm_ops);

-- ===================== db/roller.sql =====================
-- Roller (styre, daglig leder, innehaver m.m.) for alle enheter.
-- Kilde: Enhetsregisteret. Full bestand lastes med tools/load-roller.py,
-- daglige endringer (ny styreleder osv.) med tools/load-roller-delta.py
-- via GitHub Actions (.github/workflows/roller-daglig.yml).

CREATE TABLE IF NOT EXISTS brreg.roller (
    organisasjonsnummer   TEXT NOT NULL,        -- selskapet rollen gjelder for
    rollegruppe_kode      TEXT,                 -- f.eks. STYR, DAGL, INNH
    rolletype_kode        TEXT,                 -- f.eks. LEDE (styreleder), NEST, MEDL, VARA, DAGL, INNH
    rolletype_beskrivelse TEXT,
    person_navn           TEXT,                 -- satt når rollen innehas av en person
    person_fodselsdato    DATE,
    enhet_orgnr           TEXT,                 -- satt når rollen innehas av en virksomhet
    enhet_navn            TEXT,
    fratraadt             BOOLEAN,              -- true = ikke lenger aktiv i rollen
    rekkefolge            INT,
    sist_endret           DATE,
    hentet_dato           DATE DEFAULT current_date
);

CREATE INDEX IF NOT EXISTS ix_roller_orgnr  ON brreg.roller (organisasjonsnummer);
CREATE INDEX IF NOT EXISTS ix_roller_person ON brreg.roller (upper(person_navn));
-- For rask fornavn-prefiks-match (LIKE 'FORNAVN%') i suksesshistorie-oppslaget.
CREATE INDEX IF NOT EXISTS ix_roller_person_tp ON brreg.roller (upper(person_navn) text_pattern_ops);

-- Personer med styreverv legges også inn i søke-tabellen brreg.sok_navn
-- (med har_rolle=true), slik at de dukker opp i navnesøket selv om de verken
-- er aksjonær eller på skattelista. Fylles av tools/load-sok-roller.py (full)
-- og holdes oppdatert av tools/load-roller-delta.py (daglig).
ALTER TABLE brreg.sok_navn ADD COLUMN IF NOT EXISTS har_rolle BOOLEAN NOT NULL DEFAULT false;

-- Vannmerke for delta-jobben: siste behandlede oppdaterings-id fra
-- /api/oppdateringer/roller?afterId=... lagres i brreg.sync_status.
CREATE TABLE IF NOT EXISTS brreg.sync_status (
    nokkel      TEXT PRIMARY KEY,
    verdi       TEXT,
    sist_kjoert TIMESTAMPTZ
);
-- Seedes med id rett før full-lasten, slik at delta-jobben tar igjen derfra:
--   INSERT INTO brreg.sync_status (nokkel, verdi, sist_kjoert)
--   VALUES ('roller_oppdateringsid', '<siste-id>', now())
--   ON CONFLICT (nokkel) DO UPDATE SET verdi = excluded.verdi, sist_kjoert = now();

-- ===================== db/kurs.sql =====================
-- Aksjekurser + kobling til ticker, for å regne ut eierverdi (formuesbygging).
-- antall_aksjer (fra aksjonaerer) × kurs (første handelsdag i året) = verdi.
-- Kjøres idempotent. Fylles av tools/load-aksjekurs.py.

-- Kobling børsnotert selskap → ticker (det Brreg/aksjonærregisteret mangler).
CREATE TABLE IF NOT EXISTS brreg.noterte_selskap (
    orgnr        TEXT PRIMARY KEY,
    ticker       TEXT NOT NULL,
    navn         TEXT,
    isin         TEXT,
    notert_fra   DATE,
    notert_til   DATE,            -- null = fortsatt notert
    hentet_dato  TIMESTAMPTZ DEFAULT now()
);

-- Kurs ved første handelsdag hvert år (≈ 01.01).
CREATE TABLE IF NOT EXISTS brreg.aksjekurs (
    orgnr        TEXT NOT NULL,
    aar          INTEGER NOT NULL,
    dato         DATE,            -- faktisk handelsdag kursen er hentet fra
    kurs         NUMERIC,
    valuta       TEXT,
    hentet_dato  TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (orgnr, aar)
);

-- Verdi av hver eierpost per år (kun for noterte selskaper med kjent kurs).
CREATE OR REPLACE VIEW brreg.v_eierverdi AS
SELECT a.aar, a.orgnr, a.selskap, a.aksjonaer_navn, a.fodselsaar_orgnr,
       a.antall_aksjer, k.kurs, k.valuta,
       (a.antall_aksjer * k.kurs)::numeric AS verdi
FROM brreg.aksjonaerer a
JOIN brreg.aksjekurs k ON k.orgnr = a.orgnr AND k.aar = a.aar;

-- ===================== db/skatteliste.sql =====================
-- Skattelister (offentlige topp-lister per kommune): inntekt, formue, skatt.
-- Knyttes til aksjonærer på navn_upper + fødselsår.
-- Fylles av tools/load-skatteliste.py <csv>. Kjøres idempotent.

CREATE TABLE IF NOT EXISTS brreg.skatteliste (
    aar          INTEGER,
    kommunenr    TEXT,
    kommune      TEXT,
    rang         INTEGER,
    navn         TEXT,
    navn_upper   TEXT,        -- UPPER(navn) for kobling mot aksjonaerer.aksjonaer_navn
    fornavn      TEXT,
    etternavn    TEXT,
    fodselsaar   INTEGER,
    inntekt      NUMERIC,
    formue       NUMERIC,
    skatt        NUMERIC
);

-- Oppslag fra en aksjonær (navn + fødselsår) -> skatteopplysninger.
CREATE INDEX IF NOT EXISTS ix_skatt_navn ON brreg.skatteliste (navn_upper, fodselsaar);

-- ===================== db/ssb-kommune.sql =====================
-- Aggregert SSB-statistikk (åpne data) på kommune-/fylkesnivå. Ingen persondata.
-- Fylles av tools/load-ssb-kommune.py.

-- Folkemengde per kommune (SSB tabell 11805). Enabler for per-innbygger-tall.
CREATE TABLE IF NOT EXISTS brreg.ssb_befolkning (
    region_kode TEXT PRIMARY KEY,   -- 4 siffer = kommune, 2 = fylke, m.fl.
    region      TEXT,
    aar         INT,
    folkemengde BIGINT
);

-- Omsetning av fast eiendom + tinglyst beløp per fylke (SSB tabell 03222),
-- summert over fire kvartaler (nyeste komplette år). Åpen aggregat-versjon av
-- tinglysningsdata (eiendomsmarkedet), uten persondata.
CREATE TABLE IF NOT EXISTS brreg.ssb_eiendomsomsetning (
    region_kode   TEXT PRIMARY KEY,
    region        TEXT,
    aar           INT,
    omsetninger   BIGINT,    -- antall omsetninger
    tinglyst_mill NUMERIC    -- tinglyst beløp i mill. kr
);

-- ===================== db/ssb-naring.sql =====================
-- SSB næringslivsstatistikk (åpne data), per region og år. Aggregert.
-- Fylles av tools/load-ssb-naring.py.
CREATE TABLE IF NOT EXISTS brreg.ssb_konkurser (
    region_kode TEXT, region TEXT, aar INT, konkurser BIGINT,
    PRIMARY KEY (region_kode, aar)        -- åpnede konkurser (SSB 07164)
);
CREATE TABLE IF NOT EXISTS brreg.ssb_nyetablerte (
    region_kode TEXT, region TEXT, aar INT, foretak BIGINT,
    PRIMARY KEY (region_kode, aar)        -- nyetablerte foretak (SSB 08316)
);

-- ===================== db/kjoretoy.sql =====================
-- Registrerte kjøretøy i Norge etter merke og kjøretøygruppe.
-- Kilde: SSB tabell 07832 (åpne data, NLOD). Nasjonale tall, nyeste år.
-- INGEN eierinformasjon – det er ikke åpne data. Kun antall per merke.
-- Fylles av tools/load-kjoretoy.py.
CREATE TABLE IF NOT EXISTS brreg.kjoretoy_bestand (
    merke   TEXT,
    gruppe  TEXT,   -- Personbiler, Varebiler, Lastebiler, Busser, MC, ...
    aar     INT,
    antall  BIGINT,
    PRIMARY KEY (merke, gruppe, aar)
);

-- Kjøretøy etter drivstofftype og region/kommune (SSB tabell 07849, åpne data),
-- summert over "type kjøring". Gir el/bensin/diesel-fordeling og tall per kommune.
-- Fylles av tools/load-kjoretoy-drivstoff.py.
CREATE TABLE IF NOT EXISTS brreg.kjoretoy_drivstoff (
    region_kode TEXT,   -- '0'=hele landet, 2 siffer=fylke, 4 siffer=kommune
    region      TEXT,
    gruppe      TEXT,
    drivstoff   TEXT,   -- El., Bensin, Diesel, Annet drivstoff, Gass, Parafin
    aar         INT,
    antall      BIGINT,
    PRIMARY KEY (region_kode, gruppe, drivstoff, aar)
);

-- Kjøretøy etter merke PER region/kommune (SSB 07832, alle regioner). Gjør at
-- merke-fordelingen kan filtreres på kommune. Fylles av
-- tools/load-kjoretoy-merke-region.py.
CREATE TABLE IF NOT EXISTS brreg.kjoretoy_merke (
    region_kode TEXT, region TEXT, merke TEXT, gruppe TEXT, aar INT, antall BIGINT,
    PRIMARY KEY (region_kode, merke, gruppe, aar)
);

-- ===================== db/auth.sql =====================
-- Brukerautentisering for appen. Innlogging med brukernavn + passord; passordet
-- lagres som SHA-256 av "brreg:<passord>". Cookie signeres med HMAC (lib/auth.ts).
-- Legg til brukere med tools/legg-til-bruker.py. Standardbruker: admin / admin.
CREATE TABLE IF NOT EXISTS brreg.app_bruker (
    brukernavn   TEXT PRIMARY KEY,
    passord_hash TEXT NOT NULL,
    opprettet    TIMESTAMPTZ DEFAULT now()
);

-- Bokmerker per bruker (server-side, følger brukeren på tvers av enheter).
CREATE TABLE IF NOT EXISTS brreg.app_bokmerke (
    brukernavn TEXT, type TEXT, nokkel TEXT, navn TEXT, orgnr TEXT, fodselsaar TEXT,
    opprettet  TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (brukernavn, type, nokkel)
);

-- Relevans-rangering (1–6) per bruker.
CREATE TABLE IF NOT EXISTS brreg.app_rangering (
    brukernavn TEXT, navn TEXT, verdi INT,
    PRIMARY KEY (brukernavn, navn)
);

-- Egne notater per bruker på aksjonærer/personer (CRM). Søkbart fritekstfelt.
CREATE TABLE IF NOT EXISTS brreg.app_notat (
    brukernavn        TEXT, person_navn TEXT, person_fodselsaar TEXT,
    notat             TEXT, oppdatert TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (brukernavn, person_navn, person_fodselsaar)
);

-- Importerte telefonkontakter per bruker (CRM). Kobles til personer på navn.
-- Fylles av tools/load-kontakter.py fra en .vcf-fil. Personlige data.
CREATE TABLE IF NOT EXISTS brreg.app_kontakt (
    id bigserial PRIMARY KEY, brukernavn TEXT, navn TEXT, navn_upper TEXT,
    telefon TEXT, epost TEXT, sted TEXT, notat TEXT, fodselsaar TEXT
);

-- ===================== db/suksess.sql =====================
-- Cache for AI-genererte dypdykk i Suksesshistorier-fanen. Hver person genereres
-- bare én gang (via /api/suksesshistorie-dypdykk, krever ANTHROPIC_API_KEY).
CREATE TABLE IF NOT EXISTS brreg.suksess_dypdykk (
    navn     TEXT PRIMARY KEY,
    tekst    TEXT,
    generert TIMESTAMPTZ DEFAULT now()
);

-- ===================== db/dashboard.sql =====================
-- Dashboard-støtteobjekter: materialiserte views, oppslagstabell og søke-indekser
-- som driver Next.js-dashboardet i /dashboard. Kjøres idempotent.
--
-- Refresh etter at et nytt år/data er lastet:  se nederst.

-- ── Søke-indekser ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Raskt selskapsnavn-søk (ILIKE '%...%').
CREATE INDEX IF NOT EXISTS ix_enheter_navn_trgm
  ON brreg.enheter USING gin (navn gin_trgm_ops);

-- Raskt prefiks-søk på aksjonær-navn (LIKE 'PREFIKS%') på tvers av alle år.
CREATE INDEX IF NOT EXISTS ix_aksj_navn_pat
  ON brreg.aksjonaerer (aksjonaer_navn text_pattern_ops);

-- Dekkende indeks for navnesøk MED fødselsår: gjør (navn, fødselsår)-oppslaget
-- index-only (ingen heap-fetch), så autocomplete går fra ~60 s til ms.
CREATE INDEX IF NOT EXISTS ix_aksj_navn_fodsel
  ON brreg.aksjonaerer (aksjonaer_navn text_pattern_ops, fodselsaar_orgnr text_pattern_ops);

-- ── Materialiserte views (raske dashboard-tall) ───────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS brreg.mv_kpi AS
SELECT
  (SELECT count(*) FROM brreg.enheter)                                   AS antall_selskaper,
  (SELECT count(*) FROM brreg.enheter WHERE konkurs)                     AS antall_konkurs,
  (SELECT count(*) FROM brreg.enheter WHERE coalesce(under_avvikling,false)) AS antall_avvikling,
  (SELECT count(*) FROM brreg.regnskap)                                  AS antall_med_regnskap,
  (SELECT sum(reltuples)::bigint FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='brreg' AND c.relname ~ '^aksjonaerer_[0-9]+$')     AS antall_aksjeposter,
  (SELECT sum(sum_driftsinntekter) FROM brreg.regnskap)                  AS sum_driftsinntekter,
  (SELECT sum(aarsresultat) FROM brreg.regnskap)                         AS sum_aarsresultat;

CREATE MATERIALIZED VIEW IF NOT EXISTS brreg.mv_org_form AS
SELECT coalesce(organisasjonsform_kode,'(ukjent)')        AS kode,
       coalesce(organisasjonsform_beskrivelse,'(ukjent)') AS beskrivelse,
       count(*)                                           AS antall
FROM brreg.enheter GROUP BY 1,2 ORDER BY antall DESC;

CREATE MATERIALIZED VIEW IF NOT EXISTS brreg.mv_naering AS
SELECT naeringskode1_beskrivelse AS naering, count(*) AS antall
FROM brreg.enheter WHERE naeringskode1_beskrivelse IS NOT NULL
GROUP BY 1 ORDER BY antall DESC LIMIT 20;

CREATE MATERIALIZED VIEW IF NOT EXISTS brreg.mv_topp_inntekt AS
SELECT r.organisasjonsnummer, e.navn, e.forr_poststed, r.regnskapsperiode_til,
       r.sum_driftsinntekter, r.driftsresultat, r.aarsresultat, r.sum_egenkapital
FROM brreg.regnskap r
LEFT JOIN brreg.enheter e ON e.organisasjonsnummer = r.organisasjonsnummer
WHERE r.sum_driftsinntekter IS NOT NULL
ORDER BY r.sum_driftsinntekter DESC LIMIT 50;

-- Aksjeposter per år (rask, fra partisjons-estimat etter ANALYZE).
DROP TABLE IF EXISTS brreg.dash_aksjeposter_per_aar;
CREATE TABLE brreg.dash_aksjeposter_per_aar AS
SELECT substring(c.relname FROM 'aksjonaerer_(\d+)')::int AS aar,
       c.reltuples::bigint AS antall
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='brreg' AND c.relname ~ '^aksjonaerer_[0-9]+$' AND c.reltuples > 0
ORDER BY aar;

-- ── Refresh (kjør etter ny datainnlasting) ────────────────────
-- ANALYZE brreg.aksjonaerer;
-- REFRESH MATERIALIZED VIEW brreg.mv_kpi;
-- REFRESH MATERIALIZED VIEW brreg.mv_org_form;
-- REFRESH MATERIALIZED VIEW brreg.mv_naering;
-- REFRESH MATERIALIZED VIEW brreg.mv_topp_inntekt;
-- (kjør på nytt CREATE TABLE-blokken over for dash_aksjeposter_per_aar)

-- ── Kommune-screener (investering) ────────────────────────────
CREATE INDEX IF NOT EXISTS ix_enheter_kommune ON brreg.enheter (forr_kommune);

-- Kommune-liste for nedtrekket (antall selskaper med regnskap per kommune).
DROP TABLE IF EXISTS brreg.dash_kommuner;
CREATE TABLE brreg.dash_kommuner AS
SELECT e.forr_kommune AS kommune, count(*)::int AS antall
FROM brreg.enheter e
JOIN brreg.regnskap r ON r.organisasjonsnummer = e.organisasjonsnummer
WHERE e.forr_kommune IS NOT NULL
GROUP BY e.forr_kommune ORDER BY e.forr_kommune;

-- Personer per kommune (fra skattelistene) – brukes i Investering-fanen.
CREATE INDEX IF NOT EXISTS ix_skatt_kommune ON brreg.skatteliste (upper(kommune), aar);

