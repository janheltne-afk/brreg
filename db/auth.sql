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
