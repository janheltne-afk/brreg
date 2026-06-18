# brreg → PostgreSQL (Apache Hop)

Apache Hop-workflow som **inkrementelt** synkroniserer enheter fra
Brønnøysundregistrene (enhetsregisteret) til PostgreSQL. Nye enheter settes inn,
endrede oppdateres (**upsert**). Hver kjøring henter kun det som er endret siden
forrige kjøring, via brreg sitt offisielle delta-API.

> Hele løsningen er bygget med **native Hop-transforms** og er testet
> ende-til-ende mot Apache Hop 2.13 + PostgreSQL.

## Hvordan det fungerer

brreg sitt søke-API (`/api/enheter`) kan **ikke** brukes til delta eller til å
hente hele registeret (det er begrenset til de første 10 000 treffene, og
støtter ikke `oppdateringsid`). Riktig fremgangsmåte er:

1. **Delta** hentes fra `/api/oppdateringer/enheter?oppdateringsid=<markør>` —
   dette gir endrings-hendelser (org.nr + `oppdateringsid`), sortert stigende.
   `oppdateringsid` brukes som **markør (cursor)**: hver batch starter på siste
   id + 1.
2. For hvert berørte org.nr slås enheten opp på `/api/enheter/{orgnr}` (gir full
   enhetsdata; slettede enheter gir `slettedato`, ukjente gir 404 og hoppes over).
3. Enheten **upsertes** i tabellen `enheter` (nøkkel = `organisasjonsnummer`).
4. **Watermark** (høyeste behandlede `oppdateringsid`) lagres i `sync_status`,
   slik at neste kjøring fortsetter der forrige slapp.

### Workflow `brreg-enheter-sync.hwf`

```
Start → Sjekk DB-tilkobling → Opprett tabeller → Les watermark
      → Hent delta (Repeat-loop) → Oppdater watermark
```

- **Les watermark** (`brreg-init.hpl`): leser watermark og setter `CURSOR = watermark + 1`.
- **Hent delta**: en `Repeat`-action som kjører `brreg-delta-batch.hpl` om igjen til
  en batch er tom. Hver batch: henter oppdateringer → deduper org.nr →
  slår opp hver enhet → upsert → avanserer `CURSOR`. Tom batch setter `END_LOOP`
  som stopper loopen.
- **Oppdater watermark**: lagrer `CURSOR - 1` til `sync_status`.

## Filer

```
db/schema.sql                              DDL for enheter + sync_status
hop/project-config.json                    Hop-prosjektkonfig (API-URL-er, batch-størrelse)
hop/metadata/rdbms/Brreg.json              Databasetilkobling (PostgreSQL)
hop/metadata/pipeline-run-configuration/local.json
hop/metadata/workflow-run-configuration/local.json
hop/workflows/brreg-enheter-sync.hwf       Hovedworkflow (inkrementell delta)
hop/workflows/brreg-seed.hwf               Engangs full førstegangslast
hop/pipelines/brreg-init.hpl               Leser watermark → CURSOR
hop/pipelines/brreg-delta-batch.hpl        Henter én batch og gjør upsert
hop/pipelines/brreg-bulk-last.hpl          Strømmer NDJSON → bulk-insert (seeding)
tools/seed-prep.py                         Last ned + konverter + finn watermark
tools/json_array_to_ndjson.py              Strøm-konverter JSON-array → NDJSON
hop/workflows/brreg-regnskap.hwf           Henter årsregnskap (nøkkeltall) per org
hop/pipelines/brreg-regnskap-last.hpl      Per-org regnskap-oppslag → upsert
```

## Regnskap (årsregnskap-nøkkeltall)

`brreg-regnskap.hwf` henter årsregnskap for organisasjonene i `enheter`-tabellen
og upserter nøkkeltall (balanse + resultat) til tabellen `regnskap`.

- Regnskapsregisteret har **ingen bulk/delta**, så det hentes **ett oppslag per
  organisasjonsnummer** (`/regnskapsregisteret/regnskap/{orgnr}`), 16× parallelt.
- Org uten regnskap gir 404 og hoppes over; org med kan ha flere årsregnskap
  (ett per år) — alle lagres (nøkkel = regnskap-`id`).
- **NB:** å kjøre for alle ~1,16 mill. enheter tar flere timer (de fleste gir 404).
  Standard SQL i transformen *Org-numre* henter derfor kun `AS`/`ASA`. Vil du ha
  flere selskapsformer, utvid `IN ('AS','ASA')`.
- **Akkumulerer historikk fremover:** API-et gir kun siste år per selskap, men
  upsert er på regnskap-`id`. Kjører du workflowen jevnlig (f.eks. hvert
  kvartal/år), legges nye årsregnskap til som nye rader mens gamle beholdes — så
  `regnskap` bygger flerårig historikk over tid. (Dyp *fortid* finnes ikke gratis
  via dette API-et – kun siste år.)
- **Gjenoppta en avbrutt førstegangslast:** legg midlertidig til
  `AND NOT EXISTS (SELECT 1 FROM regnskap r WHERE r.organisasjonsnummer = enheter.organisasjonsnummer)`
  i *Org-numre*-SQL-en så hoppes alt ferdiglastet over. Fjern den igjen for
  periodisk oppdatering (ellers fanges ikke nye år for eksisterende selskap).
- **Kjør store jobber headless, ikke i GUI-et.** Hop Gui hoper opp logg i minnet
  over timer og kan krasje. Kjør i stedet fra kommandolinjen:
  ```
  hop-run.bat -j brreg -r local -f "${PROJECT_HOME}/workflows/brreg-regnskap.hwf"
  ```
- Kjør på nytt når du vil oppdatere (upsert på `id`). Tabellen `regnskap` har én
  rad per årsregnskap med bl.a. `sum_eiendeler`, `sum_driftsinntekter`,
  `driftsresultat`, `aarsresultat`, `sum_egenkapital`, `sum_gjeld`.
- **Robust mot nettverksfeil:** kjører 5 oppslag parallelt, og enkeltkall som
  feiler (timeout o.l.) rutes vekk uten å stoppe jobben. Org som ble hoppet over
  pga. forbigående feil fylles inn ved å kjøre workflowen på nytt (idempotent).

## Oppsett

### 1. Database
Tilkoblingen `Brreg` peker som standard på `localhost:5432`, database `brreg`,
bruker `hop`, uten passord. Endre dette i Hop Gui under **Metadata → Relational
Database Connection → Brreg**, og trykk **Test** (sett passord her hvis databasen
din krever det — passord lagres ikke i repoet).

### 2. Åpne prosjektet i Hop
**Projects → Add project → In a folder**, og pek *Home folder* til `hop/`-mappen
(der `project-config.json` ligger). Tilkobling, pipelines og workflow lastes inn
automatisk.

### 3. Kjør
Åpne `workflows/brreg-enheter-sync.hwf` og trykk **Run**. Fra kommandolinjen:

```bash
hop-run.sh --project=brreg --runconfig=local \
  --file='${PROJECT_HOME}/workflows/brreg-enheter-sync.hwf'
```

## Førstegangslast (seeding) av hele registeret

`sync_status` starter med watermark `0`. Å laste hele registeret via delta er ikke
praktisk (~24 mill. hendelser). Bruk derfor **seed-workflowen** én gang for å laste
alle ~1,16 mill. enheter, og sett watermark til nåværende punkt. Etterpå holder
`brreg-enheter-sync` alt løpende oppdatert.

### 1. Last ned + konverter + finn watermark
brreg sin bulk-fil er en gigantisk JSON-array (~2 GB), som Hop ikke kan streame.
`tools/seed-prep.py` laster den ned, strøm-konverterer til NDJSON (én enhet pr.
linje – lavt minne) og finner nåværende høyeste `oppdateringsid`:

```bash
python tools/seed-prep.py hop/seed/enheter.ndjson
```
Skriptet bruker kun Python-standardbibliotek. Til slutt skriver det ut en
`SEED_WATERMARK`-verdi – noter den. (Har du ikke Python: `docker run --rm -v
"${PWD}:/data" -w /data python:3-slim python tools/seed-prep.py hop/seed/enheter.ndjson`.)

### 2. Kjør seed-workflowen
Åpne `workflows/brreg-seed.hwf` i Hop og kjør den med parametrene:
- `SEED_FILE` = `${PROJECT_HOME}/seed/enheter.ndjson` (standard)
- `SEED_WATERMARK` = verdien fra steg 1

Eller fra kommandolinjen:
```bash
hop-run.sh --project=brreg --runconfig=local \
  --file='${PROJECT_HOME}/workflows/brreg-seed.hwf' \
  --parameters=SEED_WATERMARK=<verdi>
```
Workflowen tømmer `enheter`, bulk-inserter alle enhetene (strømmende, ~1–2 min),
og setter watermark. **NB:** bulk-fila er et døgnferskt øyeblikksbilde – kjør
`brreg-enheter-sync` rett etterpå for å fange opp endringer siden snapshotet.

### 3. Videre drift
Kjør `brreg-enheter-sync` regelmessig (manuelt eller på timeplan) – den henter kun
nye/endrede enheter siden sist.

## Merknader
- **Adresser**: `forr_adresse`/`post_adresse` tar første adresselinje (`adresse[0]`).
- **Slettede enheter** fanges opp via `slettedato`-kolonnen.
- **Batch-størrelse** styres av variabelen `BATCH_SIZE` (standard 500).
- Validert mot Apache Hop 2.13. Eldre/nyere versjoner kan ha små XML-forskjeller.
