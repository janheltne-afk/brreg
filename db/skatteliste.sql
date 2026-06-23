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
