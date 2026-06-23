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
