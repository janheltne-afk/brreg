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
