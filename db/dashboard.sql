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
