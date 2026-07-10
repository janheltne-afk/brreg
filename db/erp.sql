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
    ('Sage X3'), ('Epicor Kinetic'), ('Acumatica'), ('QAD Adaptive ERP'),
    ('RamBase QMS')
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

-- Norske RamBase-kunder fra offentlige kundecase på rambase.com
-- (resources/customer-references). ERP = full RamBase Cloud ERP;
-- QMS-kundene bruker kun kvalitetsstyringsmodulen (kjører annet ERP i bunn)
-- og ligger som eget system 'RamBase QMS' så filteret skiller dem.
-- Org.nr verifisert mot brreg-API-et.
INSERT INTO brreg.selskap_erp (organisasjonsnummer, erp_system, erp_scope, status, notat) VALUES
    -- RamBase Cloud ERP
    ('974533014', 'RamBase Cloud ERP', 'Full ERP', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com; lagerrobotikk'),        -- AutoStore AS
    ('981649230', 'RamBase Cloud ERP', 'Full ERP', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com; maskinering'),           -- Aarbakke AS
    ('974533146', 'RamBase Cloud ERP', 'Full ERP', 'Bekreftet (kundecase)', 'Offentlig kundecase; RamBase ble utviklet i Hatteland-konsernet'), -- Hatteland Technology AS
    ('982378664', 'RamBase Cloud ERP', 'Full ERP', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com; EMS/elektronikk'),       -- Westcontrol AS
    ('979390718', 'RamBase Cloud ERP', 'Full ERP', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com; subsea/ROV'),            -- Kystdesign AS
    ('818132182', 'RamBase Cloud ERP', 'Full ERP', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com; akvarobotikk'),          -- Aqua Robotics AS
    ('929455568', 'RamBase Cloud ERP', 'Full ERP', 'Bekreftet (kundecase)', 'Offentlig kundecase (som Halodi Robotics, nå 1X Technologies)'), -- 1X Technologies AS
    ('916540892', 'RamBase Cloud ERP', 'Full ERP', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com; droner'),                -- Griff Aviation AS
    ('915912850', 'RamBase Cloud ERP', 'Full ERP', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com; projektorer'),           -- Norxe AS
    ('977249368', 'RamBase Cloud ERP', 'Full ERP', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com; marine ingredienser'),   -- Seagarden AS
    ('983356494', 'RamBase Cloud ERP', 'Full ERP', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com; kveiteoppdrett'),        -- Sterling White Halibut AS
    ('983821030', 'RamBase Cloud ERP', 'Full ERP', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com; CNC-maskinering'),       -- Stamas Solutions AS
    ('980429245', 'RamBase Cloud ERP', 'Full ERP', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com'),                        -- Pretec AS
    ('921770359', 'RamBase Cloud ERP', 'Full ERP', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com; pumper'),                -- Ydra AS
    ('814056872', 'RamBase Cloud ERP', 'Full ERP', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com; løfteutstyr'),           -- Kolos Lifting & Inspection AS
    ('937820747', 'RamBase Cloud ERP', 'Full ERP', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com'),                        -- Velde Industri AS
    ('967794104', 'RamBase Cloud ERP', 'Full ERP', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com; metallbearbeiding'),     -- KSMV AS
    ('884048842', 'RamBase Cloud ERP', 'Full ERP', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com; spedisjon'),             -- Logi Trans AS
    -- RamBase QMS (kun kvalitetsstyring — annet ERP i bunn)
    ('914778271', 'RamBase QMS', 'Kun QMS', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com; kvalitetsstyring'),             -- Norsk Hydro ASA
    ('980518647', 'RamBase QMS', 'Kun QMS', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com; kvalitetsstyring'),             -- Eramet Norway AS
    ('975934578', 'RamBase QMS', 'Kun QMS', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com; kvalitetsstyring'),             -- Speira AS
    ('925323276', 'RamBase QMS', 'Kun QMS', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com; kvalitetsstyring'),             -- Blu Electro AS
    ('816850002', 'RamBase QMS', 'Kun QMS', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com; kvalitetsstyring'),             -- Blu Offshore AS
    ('988117382', 'RamBase QMS', 'Kun QMS', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com; kvalitetsstyring'),             -- Norwegian Offshore Rental AS
    ('988976849', 'RamBase QMS', 'Kun QMS', 'Bekreftet (kundecase)', 'Offentlig kundecase; tre ISO-sertifiseringer med RamBase'),         -- Lie Blikk AS
    ('915710468', 'RamBase QMS', 'Kun QMS', 'Bekreftet (kundecase)', 'Offentlig kundecase på rambase.com; kvalitetsstyring')              -- Sandvold & Velde Supply AS
ON CONFLICT (organisasjonsnummer, erp_system) DO NOTHING;

-- Tripletex-kunder fra offentlige kundehistorier (tripletex.no/fagblogg/kundehistorier).
-- Tripletex er regnskaps-/økonomisystem (ikke full ERP) — scope merket deretter.
-- Org.nr verifisert mot brreg-API-et. Kun entydig identifiserte selskaper er tatt
-- med; Devspace, Advantek Norge, Collett Flattum, Dronningfjell og Byggmester
-- Jakob lot seg ikke koble sikkert og er utelatt.
INSERT INTO brreg.selskap_erp (organisasjonsnummer, erp_system, erp_scope, status, notat) VALUES
    ('931638920', 'Tripletex', 'Regnskap/økonomi', 'Bekreftet (kundecase)', 'Offentlig kundehistorie på tripletex.no; bygg'),          -- Lødøen Bygg AS
    ('916833393', 'Tripletex', 'Regnskap/økonomi', 'Bekreftet (kundecase)', 'Offentlig kundehistorie på tripletex.no; renhold/facility'), -- Totality Facility Services AS
    ('981408438', 'Tripletex', 'Regnskap/økonomi', 'Bekreftet (kundecase)', 'Offentlig kundehistorie på tripletex.no; varehandel/lager'), -- Instant Norge AS
    ('928653137', 'Tripletex', 'Regnskap/økonomi', 'Bekreftet (kundecase)', 'Offentlig kundehistorie på tripletex.no; restaurant (Henningsvær)'), -- Klatrekafeen AS
    ('925622516', 'Tripletex', 'Regnskap/økonomi', 'Bekreftet (kundecase)', 'Offentlig kundehistorie på tripletex.no; jernbaneentreprenør'), -- Site Service Bane AS
    ('916081324', 'Tripletex', 'Regnskap/økonomi', 'Bekreftet (kundecase)', 'Offentlig kundehistorie på tripletex.no; restaurant'),      -- Tyrkisk Kjøkken AS
    ('922655103', 'Tripletex', 'Regnskap/økonomi', 'Bekreftet (kundecase)', 'Offentlig kundehistorie på tripletex.no; kafé/servering (Oslo)'), -- Talormade AS
    ('921707959', 'Tripletex', 'Regnskap/økonomi', 'Bekreftet (kundecase)', 'Offentlig kundehistorie på tripletex.no; elektroentreprenør'), -- Øst Elektro AS
    ('917653135', 'Tripletex', 'Regnskap/økonomi', 'Bekreftet (kundecase)', 'Offentlig kundehistorie på tripletex.no; vertikalt landbruk (Onna)'), -- Onna Greens AS
    ('919997400', 'Tripletex', 'Regnskap/økonomi', 'Bekreftet (kundecase)', 'Offentlig kundehistorie på tripletex.no; solenergi'),       -- Solcellekraft AS
    ('918547258', 'Tripletex', 'Regnskap/økonomi', 'Bekreftet (kundecase)', 'Offentlig kundehistorie på tripletex.no; edtech'),          -- Learnlab AS
    ('927210142', 'Tripletex', 'Regnskap/økonomi', 'Bekreftet (kundecase)', 'Offentlig kundehistorie på tripletex.no; eiendomsutvikling/loft'), -- Ymro AS
    ('923149430', 'Tripletex', 'Regnskap/økonomi', 'Bekreftet (kundecase)', 'Offentlig kundehistorie på tripletex.no; helseteknologi (migrene)'), -- Nordic Brain Tech AS
    ('933086550', 'Tripletex', 'Regnskap/økonomi', 'Bekreftet (kundecase)', 'Offentlig kundehistorie på tripletex.no; vindusutskifting'), -- Vindux AS
    ('995398214', 'Tripletex', 'Regnskap/økonomi', 'Bekreftet (kundecase)', 'Offentlig kundehistorie på tripletex.no; skjønnhet/retail'), -- Lyko AS
    ('983545300', 'Tripletex', 'Regnskap/økonomi', 'Bekreftet (kundecase)', 'Offentlig kundehistorie på tripletex.no; bilberging')       -- Redningsverket AS
ON CONFLICT (organisasjonsnummer, erp_system) DO NOTHING;

-- PowerOffice Go-kunder fra offentlige kundehistorier/artikler (poweroffice.no).
-- PowerOffice Go er regnskaps-/økonomisystem (ikke full ERP). Org.nr verifisert
-- mot brreg-API-et. PowerOffice har ingen samlet kundecase-oversikt; disse er de
-- navngitte end-kundene funnet i deres artikler/omtaler.
INSERT INTO brreg.selskap_erp (organisasjonsnummer, erp_system, erp_scope, status, notat) VALUES
    ('997071387', 'PowerOffice Go', 'Regnskap/økonomi', 'Bekreftet (kundecase)', 'Offentlig kundehistorie på poweroffice.no; bilverksted (Narvik)'), -- Holmen Bilservice AS
    ('919807784', 'PowerOffice Go', 'Regnskap/økonomi', 'Bekreftet (kundecase)', 'Offentlig kundehistorie på poweroffice.no; byggentreprenør (Narvik)'), -- Narvik Bygg AS
    ('911715732', 'PowerOffice Go', 'Regnskap/økonomi', 'Bekreftet (kundecase)', 'Offentlig kundehistorie på poweroffice.no; maskinentreprenør/stein') -- Røyseth Maskin AS
ON CONFLICT (organisasjonsnummer, erp_system) DO NOTHING;
