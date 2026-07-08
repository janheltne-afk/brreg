-- ERP-system per selskap: gjør det mulig å søke opp et selskap og se hvilket
-- ERP-system det bruker, og å filtrere/bla på ERP-system (kun de som faktisk
-- har registrerte selskaper vises i filteret – se app/api/erp-systemer).
-- Kjøres idempotent.

-- Masterliste over kjente ERP-systemer (referansedata for å unngå stavevarianter
-- ved fremtidig registrering). Ikke alle har selskaper knyttet til seg ennå.
CREATE TABLE IF NOT EXISTS brreg.erp_systemer (
    navn TEXT PRIMARY KEY
);

INSERT INTO brreg.erp_systemer (navn) VALUES
    ('SAP S/4HANA'), ('SAP ECC'), ('SAP Business One'),
    ('Microsoft Dynamics 365 Finance'), ('Microsoft Dynamics 365 Supply Chain Management'),
    ('Microsoft Dynamics 365 Business Central'), ('Microsoft Dynamics NAV'), ('Microsoft Dynamics AX'),
    ('Oracle NetSuite'), ('Oracle Fusion Cloud ERP'), ('Oracle E-Business Suite'),
    ('Infor M3'), ('Infor LN'), ('Infor CloudSuite Industrial'),
    ('IFS Cloud'), ('IFS Applications'),
    ('Unit4 ERP'), ('Unit4 Business World'), ('Agresso'),
    ('Workday Financial Management'), ('Deltek Maconomy'),
    ('RamBase Cloud ERP'), ('Monitor ERP'), ('Jeeves ERP'), ('Ridder iQ'), ('MyProduction'),
    ('HansaWorld Standard ERP'),
    ('Visma Business'), ('Business NXT'), ('Visma.net ERP'), ('Visma Global'),
    ('Visma DI Business'), ('Visma Contracting'), ('Visma Enterprise Plus Økonomi'),
    ('Visma eAccounting'), ('Visma Mamut'),
    ('Tripletex'), ('PowerOffice Go'), ('Xledger'), ('Finago'), ('24SevenOffice'),
    ('Unimicro'), ('Uni Economy'),
    ('DNB Regnskap'), ('SpareBank 1 Regnskap'), ('Eika Regnskap'),
    ('Fiken'), ('Conta'), ('Systima'), ('Duett'), ('Zirius'), ('Luca'), ('Snapbooks'),
    ('CloudOffice ERP'), ('WebOfficeOne'), ('Agro Økonomi'),
    ('Odoo'), ('ERPNext'), ('Dolibarr'),
    ('Sage X3'), ('Epicor Kinetic'), ('Acumatica'), ('QAD Adaptive ERP')
ON CONFLICT (navn) DO NOTHING;

-- Selskap ↔ ERP-system. organisasjonsnummer har bevisst ingen FK mot
-- brreg.enheter (samme mønster som brreg.regnskap) – da tåler tabellen
-- registrering før/etter enheten finnes i enheter-tabellen.
CREATE TABLE IF NOT EXISTS brreg.selskap_erp (
    organisasjonsnummer  TEXT NOT NULL,
    erp_system            TEXT NOT NULL REFERENCES brreg.erp_systemer (navn),
    erp_scope             TEXT,           -- f.eks. "Full ERP", "Kun økonomi", "TBD"
    status                TEXT,           -- f.eks. "Bekreftet", "Kjent av deg", "Antatt"
    notat                 TEXT,
    oppdatert_dato        TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (organisasjonsnummer, erp_system)
);
CREATE INDEX IF NOT EXISTS idx_selskap_erp_orgnr  ON brreg.selskap_erp (organisasjonsnummer);
CREATE INDEX IF NOT EXISTS idx_selskap_erp_system ON brreg.selskap_erp (erp_system);

-- Kjente ERP-kunder (manuelt registrert).
INSERT INTO brreg.selskap_erp (organisasjonsnummer, erp_system, erp_scope, status) VALUES
    ('923609016', 'SAP S/4HANA', 'TBD', 'Kjent av deg'),  -- Equinor ASA
    ('931693670', 'Infor LN', 'TBD', 'Kjent av deg'),     -- AKVA Group ASA
    ('843495672', 'Infor M3', 'TBD', 'Kjent av deg'),  -- Berggård Amundsen & Co AS
    ('911382008', 'Infor M3', 'TBD', 'Kjent av deg'),  -- Elkem ASA
    ('997639588', 'Infor M3', 'TBD', 'Kjent av deg'),  -- Europris ASA
    ('987094753', 'Infor M3', 'TBD', 'Kjent av deg'),  -- Hennig-Olsen Is AS
    ('867492062', 'Infor M3', 'TBD', 'Kjent av deg'),  -- Janusfabrikken AS
    ('934672194', 'Infor M3', 'TBD', 'Kjent av deg'),  -- Møbelringen AS
    ('980411133', 'Infor M3', 'TBD', 'Kjent av deg'),  -- Norsk Kylling AS
    ('937087977', 'Infor M3', 'TBD', 'Kjent av deg'),  -- Plantasjen Norge AS
    ('988015024', 'Infor M3', 'TBD', 'Kjent av deg'),  -- Skala AS
    ('991212531', 'Infor M3', 'TBD', 'Kjent av deg'),  -- Saint-Gobain Distribution Norway AS
    ('947942638', 'Infor M3', 'TBD', 'Kjent av deg'),  -- Tine SA
    ('987102160', 'Infor M3', 'TBD', 'Kjent av deg'),  -- Wonderland AS
    ('985748128', 'Infor M3', 'TBD', 'Kjent av deg')   -- Øglænd System AS
ON CONFLICT (organisasjonsnummer, erp_system)
DO UPDATE SET erp_scope = EXCLUDED.erp_scope, status = EXCLUDED.status, oppdatert_dato = now();

-- Medlemmer av norsk Infor-brukerforening: bruker M3 eller LN, produkt ANTATT
-- ut fra bransjeprofil (M3 = distribusjon/retail/mat/fôr/prosess/møbel/mote,
-- LN = diskret og prosjektbasert industri/maritim/elektronikk).
-- Org.nr verifisert mot brreg-API-et. DO NOTHING så bekreftede rader aldri overskrives.
INSERT INTO brreg.selskap_erp (organisasjonsnummer, erp_system, erp_scope, status, notat) VALUES
    -- Antatt Infor M3
    ('938536562', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; verkstedutstyr-distribusjon'),      -- Andr. L. Riis AS
    ('937843860', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; fiskefôr (prosess)'),               -- BioMar AS
    ('810859482', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; møbelproduksjon'),                  -- Brunstad AS
    ('958457952', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; Norgesmøllene (mat)'),              -- Cernova AS
    ('938786054', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; dagligvare/retail'),                -- Coop Midt-Norge SA
    ('938097119', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; sykkel-engros'),                    -- Cycleurope Norge AS
    ('816051142', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; stål/byggevarer-engros'),           -- E.A. Smith AS
    ('976516575', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; sko engros/retail (medlemsnavn: Euro Sko Norge)'), -- Eurosko Gruppen AS
    ('975856844', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; fôrproduksjon'),                    -- Fiskå Mølle AS
    ('932736578', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; møbler (HÅG m.fl.)'),               -- Flokk Holding AS
    ('912007782', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; belysning (volumproduksjon)'),      -- Glamox AS
    ('934505557', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; metall/prosess'),                   -- Ineos Tyssedal AS
    ('913807146', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; jernvare-engros'),                  -- Jernia AS
    ('989519247', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; ovnsproduksjon + distribusjon'),    -- Jøtul AS
    ('913344162', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; næringsmidler'),                    -- Kavli Holding AS
    ('910629085', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; kornvarer (mat)'),                  -- Lantmannen Cerealia AS
    ('964118191', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; sjømat (prosess)'),                 -- Mowi ASA
    ('891806752', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; vindu/dør-produksjon'),             -- NorDan Gruppen AS
    ('971047917', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; dagligvare (IT for NorgesGruppen)'), -- Norgesgruppen Data AS
    ('985933197', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; fiskekroker/sportsutstyr'),         -- O Mustad & Søn AS
    ('962018025', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; drikkevarer'),                      -- Oskar Sylte Mineralvannsfabrikk AS
    ('918375643', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; utstyrs-engros/service'),           -- Primulator AS
    ('983599060', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; membraner/plast (prosess)'),        -- Protan AS
    ('944178228', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; gjenvinning/miljøtjenester'),       -- SAR AS
    ('920044735', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; sjømat (reker)'),                   -- Stella Polaris AS
    ('916329717', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; korn/fôr'),                         -- Strand Unikorn AS
    ('925349607', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; spedisjon/logistikk'),              -- Tyrholm & Farstad AS
    ('979490674', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; mote-retail (kjent M3-segment)'),   -- Varner AS
    ('925971154', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; batterimaterialer (prosess, Elkem-JV)'), -- Vianode AS
    ('957560199', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; mote-retail'),                      -- Voice Norge AS
    ('953803674', 'Infor M3', 'TBD', 'Antatt', 'Infor-brukerforening; kjemi (prosess)'),                  -- Wilhelmsen Chemicals AS
    -- Bekreftet av bruker (opprinnelig antatt LN — korrigert)
    ('995884070', 'Infor M3', 'TBD', 'Kjent av deg', 'Infor-brukerforening'),                             -- Brunvoll AS
    ('914853052', 'Infor M3', 'TBD', 'Kjent av deg', 'Infor-brukerforening'),                             -- AS Nymo
    ('982457602', 'Infor M3', 'TBD', 'Kjent av deg', 'Infor-brukerforening'),                             -- Møre Electric Group AS
    ('914561973', 'Infor M3', 'TBD', 'Kjent av deg', 'Infor-brukerforening'),                             -- Topro Industri AS
    ('930400580', 'Infor CloudSuite Industrial', 'TBD', 'Kjent av deg', 'Infor CloudSuite Industrial (Enterprise Manufacturing)'), -- ENRX AS
    ('920652964', 'Infor CloudSuite Industrial', 'TBD', 'Kjent av deg', 'CloudSuite Industrial Enterprise + Factory Track + Infor OS + custom grensesnitt mot service-/bankapplikasjoner') -- Pixii AS
ON CONFLICT (organisasjonsnummer, erp_system) DO NOTHING;

-- Opprydding: disse seks lå tidligere inne som antatt 'Infor LN' (feil gjetting,
-- korrigert av bruker over). Fjerner LN-radene hvis en eldre versjon av denne
-- fila er kjørt mot databasen.
DELETE FROM brreg.selskap_erp
WHERE erp_system = 'Infor LN' AND status = 'Antatt'
  AND organisasjonsnummer IN
      ('995884070', '930400580', '982457602', '914853052', '920652964', '914561973');
