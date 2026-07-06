-- Konkursregisteret: analyseobjekter oppå brreg.enheter (konkurs/konkursdato).
--
-- Merk: det offisielle frittstående "Konkursregisteret" fra Brønnøysundregistrene
-- (med bostyrer, kunngjøringstekst osv.) krever egen maskin-til-maskin-avtale for
-- oppslag på fødselsnummer, og er ikke tilgjengelig som åpne data. Det som brukes
-- her er feltene `konkurs`/`konkursdato` fra enhetsregisterets åpne API — samme
-- kilde som resten av `brreg.enheter` allerede synkes fra (se brreg-enheter-sync).
-- Det gir bransje-, kommune- og tidsseriedata for konkurser uten spesialtilgang.
--
-- Kjøres idempotent. Refresh av materialiserte views: se nederst.

CREATE INDEX IF NOT EXISTS idx_enheter_naeringskode1 ON brreg.enheter (naeringskode1);

-- Rå liste over konkursrammede enheter (brukes til søk/utforsking/eksport).
CREATE OR REPLACE VIEW brreg.v_konkurser AS
SELECT organisasjonsnummer, navn,
       naeringskode1               AS bransje_kode,
       naeringskode1_beskrivelse   AS bransje,
       organisasjonsform_kode,
       organisasjonsform_beskrivelse,
       forr_kommune                AS kommune,
       forr_kommunenummer          AS kommunenummer,
       konkursdato,
       extract(year FROM konkursdato)::int AS konkursaar
FROM brreg.enheter
WHERE konkurs IS TRUE;

-- Antall konkurser per bransje (for bransjeanalyse: hvilke næringer rammes mest).
CREATE MATERIALIZED VIEW IF NOT EXISTS brreg.mv_konkurser_bransje AS
SELECT coalesce(bransje_kode, '(ukjent)')  AS bransje_kode,
       coalesce(bransje, '(ukjent)')       AS bransje,
       count(*)                            AS antall
FROM brreg.v_konkurser
GROUP BY 1, 2
ORDER BY antall DESC;

-- Antall konkurser per år (tidsserie, kun der konkursdato er kjent).
CREATE MATERIALIZED VIEW IF NOT EXISTS brreg.mv_konkurser_per_aar AS
SELECT konkursaar AS aar, count(*) AS antall
FROM brreg.v_konkurser
WHERE konkursaar IS NOT NULL
GROUP BY 1
ORDER BY 1;

-- Bransje × år (trend per bransje over tid).
CREATE MATERIALIZED VIEW IF NOT EXISTS brreg.mv_konkurser_bransje_aar AS
SELECT konkursaar AS aar,
       coalesce(bransje, '(ukjent)') AS bransje,
       count(*) AS antall
FROM brreg.v_konkurser
WHERE konkursaar IS NOT NULL
GROUP BY 1, 2
ORDER BY 1, antall DESC;

-- Antall konkurser per kommune (geografisk analyse).
CREATE MATERIALIZED VIEW IF NOT EXISTS brreg.mv_konkurser_kommune AS
SELECT coalesce(kommune, '(ukjent)') AS kommune, count(*) AS antall
FROM brreg.v_konkurser
GROUP BY 1
ORDER BY antall DESC;

-- ── Refresh (kjør etter ny datainnlasting/sync) ────────────────
-- REFRESH MATERIALIZED VIEW brreg.mv_konkurser_bransje;
-- REFRESH MATERIALIZED VIEW brreg.mv_konkurser_per_aar;
-- REFRESH MATERIALIZED VIEW brreg.mv_konkurser_bransje_aar;
-- REFRESH MATERIALIZED VIEW brreg.mv_konkurser_kommune;
