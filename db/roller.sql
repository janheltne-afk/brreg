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
