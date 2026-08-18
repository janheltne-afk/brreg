-- Aksjonærer (eierposter) – kombinert tabell på tvers av år, som appen søker mot.
-- Kilde: Skatteetatens aksjonærregister (årlig). Rå årsfiler lastes til
-- brreg.aksjonaerer_<år> (én pr. år); denne kombinerte tabellen fylles/oppdateres
-- av aksjonær-loaderen. Definisjonen her sikrer at views/indekser bygger selv om
-- data ikke er lastet ennå. Kjøres idempotent.
CREATE TABLE IF NOT EXISTS brreg.aksjonaerer (
    aar               INTEGER,
    orgnr             TEXT,
    selskap           TEXT,
    aksjonaer_navn    TEXT,
    fodselsaar_orgnr  TEXT,
    antall_aksjer     BIGINT
);
