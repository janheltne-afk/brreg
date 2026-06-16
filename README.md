# brreg → PostgreSQL (Apache Hop)

Apache Hop-workflow som henter enheter fra Brønnøysundregistrene
(enhetsregisteret) og laster dem inn i PostgreSQL. Nye enheter settes inn,
endrede enheter oppdateres (**upsert**). Løsningen bruker `oppdateringsid` som
*watermark*, slik at hver kjøring kun henter enheter som er nye eller endret
siden forrige kjøring — altså «data som ikke finnes / ikke er oppdatert fra
før».

Alt er bygget med **native Hop-transforms** (REST Client, JSON Input,
Insert/Update m.fl.) — ingen PowerShell eller `psql` i Docker.

## Innhold

```
db/schema.sql                          DDL for tabellene (samme som workflowen oppretter)
hop/project-config.json                Hop-prosjektkonfig med standardvariabler
hop/metadata/rdbms/Brreg.json          Databasetilkobling (PostgreSQL, via variabler)
hop/workflows/brreg-enheter-sync.hwf   Hovedworkflow (orkestrering)
hop/pipelines/brreg-init.hpl           Leser watermark → variabel LAST_OPPDATERINGSID
hop/pipelines/brreg-tell-sider.hpl     Finner antall sider → variabel TOTAL_PAGES
hop/pipelines/brreg-last.hpl           Henter alle sider og gjør upsert mot enheter
```

## Slik fungerer workflowen

`brreg-enheter-sync.hwf` kjører stegene i rekkefølge:

1. **Sjekk DB-tilkobling** – verifiserer at `Brreg`-tilkoblingen svarer.
2. **Opprett tabeller** – kjører `CREATE TABLE IF NOT EXISTS` for `enheter` og
   `sync_status`, og seeder watermark til `0` ved første kjøring.
3. **Les watermark** (`brreg-init`) – henter siste lastede `oppdateringsid` fra
   `sync_status` og legger den i variabelen `LAST_OPPDATERINGSID`.
4. **Tell sider** (`brreg-tell-sider`) – kaller API-et med
   `?oppdateringsid=LAST_OPPDATERINGSID&sort=oppdateringsid,asc` for å lese
   `page.totalPages` for delta-settet → variabelen `TOTAL_PAGES`.
5. **Last enheter** (`brreg-last`) – genererer én rad per side (`0 .. TOTAL_PAGES-1`),
   henter hver side via REST, parser `_embedded.enheter` med JSON Input og kjører
   en **Insert/Update** mot tabellen `enheter` (nøkkel = `organisasjonsnummer`).
6. **Oppdater watermark** – setter `sync_status.verdi` til høyeste
   `oppdateringsid` i tabellen, slik at neste kjøring fortsetter derfra.

Hvis det ikke finnes nye/endrede enheter blir `TOTAL_PAGES = 0`, og steg 5 gjør
ingenting. Watermarket forblir uendret.

> **Førstegangskjøring:** Med watermark `0` hentes *hele* registeret
> (~1,1 mill. enheter). Det tar tid og mange API-kall. Etterfølgende kjøringer
> henter kun delta og går raskt.

## Oppsett

### 1. Variabler / hemmeligheter

Databasetilkoblingen leser disse variablene (passord committes **ikke** til
repoet — sett det som miljøvariabel):

| Variabel             | Standard (i project-config) | Beskrivelse        |
|----------------------|-----------------------------|--------------------|
| `BRREG_DB_HOST`      | `localhost`                 | PostgreSQL host    |
| `BRREG_DB_PORT`      | `5432`                      | PostgreSQL port    |
| `BRREG_DB_NAME`      | `brreg`                     | Database           |
| `BRREG_DB_USER`      | `hop`                       | Bruker             |
| `BRREG_DB_PASSWORD`  | *(ikke satt)*               | **Sett selv**      |
| `BRREG_API`          | enhetsregisteret-URL        | Basis-URL          |
| `PAGE_SIZE`          | `500`                       | Enheter per side   |

Sett passordet f.eks. slik før du starter Hop:

```bash
export BRREG_DB_PASSWORD='ditt_passord'
```

### 2. Åpne prosjektet i Hop

1. I Hop Gui: **Projects → Add a project**, og pek `Home folder` til `hop/`
   (mappen med `project-config.json`).
2. Tilkoblingen `Brreg` og pipelines/workflows dukker opp automatisk.
3. Åpne `brreg-enheter-sync.hwf` og trykk **Run**.

### Kjøre fra kommandolinjen (hop-run)

```bash
hop-run.sh \
  --project=brreg \
  --runconfig=local \
  --file='${PROJECT_HOME}/workflows/brreg-enheter-sync.hwf'
```

(På Windows: `hop-run.bat`.)

### 3. (Valgfritt) Opprett skjema manuelt

Workflowen oppretter tabellene selv, men du kan også kjøre `db/schema.sql`
direkte mot databasen om du vil sette opp skjemaet på forhånd.

## Merknader / kjente begrensninger

- **Adresser**: `forr_adresse`/`post_adresse` i API-et er en liste med
  adresselinjer. Pipelinen henter første linje (`adresse[0]`). Vil du
  konkatenere flere linjer, kan det gjøres med en «User Defined Java
  Expression»-transform i `brreg-last.hpl`.
- **Sidetelling** beregnes én gang ved start. Endres datasettet midt i en
  lang kjøring, kan antallet drifte litt — neste kjøring fanger opp resten via
  watermark.
- **Verifisering**: Filene er Hop-XML laget for å åpnes i Hop Gui. Sjekk gjerne
  felt-typer (særlig dato/boolean) og tilkoblingsdetaljer i GUI før produksjon.
