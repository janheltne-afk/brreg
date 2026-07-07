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

-- Kjente Infor M3-kunder.
INSERT INTO brreg.selskap_erp (organisasjonsnummer, erp_system, erp_scope, status) VALUES
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
