-- Skjema for brreg-enhetsregisteret i PostgreSQL
-- Kjøres idempotent av workflowen (CREATE ... IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS enheter (
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
CREATE TABLE IF NOT EXISTS sync_status (
    nokkel       TEXT PRIMARY KEY,
    verdi        TEXT,
    sist_kjoert  TIMESTAMPTZ
);

-- Legg til kolonner på en eventuell eksisterende enheter-tabell (eldre oppsett).
ALTER TABLE enheter ADD COLUMN IF NOT EXISTS slettedato DATE;
ALTER TABLE enheter ADD COLUMN IF NOT EXISTS oppdateringsid BIGINT;
ALTER TABLE enheter ADD COLUMN IF NOT EXISTS hentet_dato TIMESTAMPTZ DEFAULT now();

-- Indeks som brukes for å finne neste delta-batch raskt.
CREATE INDEX IF NOT EXISTS idx_enheter_oppdateringsid ON enheter (oppdateringsid);

-- Seed watermark hvis den ikke finnes (verdi 0 = hent alt fra start).
INSERT INTO sync_status (nokkel, verdi, sist_kjoert)
VALUES ('enheter_oppdateringsid', '0', NULL)
ON CONFLICT (nokkel) DO NOTHING;

-- ============================================================
-- Regnskap (årsregnskap-nøkkeltall, hentet per organisasjonsnummer)
-- ============================================================
CREATE TABLE IF NOT EXISTS regnskap (
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
CREATE INDEX IF NOT EXISTS idx_regnskap_orgnr ON regnskap (organisasjonsnummer);
