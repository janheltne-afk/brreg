-- SSB næringslivsstatistikk (åpne data), per region og år. Aggregert.
-- Fylles av tools/load-ssb-naring.py.
CREATE TABLE IF NOT EXISTS brreg.ssb_konkurser (
    region_kode TEXT, region TEXT, aar INT, konkurser BIGINT,
    PRIMARY KEY (region_kode, aar)        -- åpnede konkurser (SSB 07164)
);
CREATE TABLE IF NOT EXISTS brreg.ssb_nyetablerte (
    region_kode TEXT, region TEXT, aar INT, foretak BIGINT,
    PRIMARY KEY (region_kode, aar)        -- nyetablerte foretak (SSB 08316)
);
