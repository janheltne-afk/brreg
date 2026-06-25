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
