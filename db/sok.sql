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
