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
