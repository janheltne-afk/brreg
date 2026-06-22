# Brreg-dashboard

Next.js-dashboard som kobler **enheter**, **regnskap** og **aksjonærer** fra
Brønnøysundregistrene/Skatteetaten (Supabase Postgres).

## Faner
- **Oversikt** – nøkkeltall + grafer (organisasjonsformer, næringer, aksjeposter per år)
- **Selskaper** – søk et selskap → enhetsinfo, siste regnskap og største aksjeeiere samlet
- **Aksjonær** – søk en person/eier → aksjepostene deres **år for år** (selskap × år-matrise)
- **Regnskap** – topp 50 selskaper etter driftsinntekter

## Teknologi
Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · Recharts ·
[postgres.js](https://github.com/porsager/postgres). Data hentes server-side; ingen
DB-hemmeligheter eksponeres i nettleseren.

## Lokal kjøring
```bash
cd dashboard
npm install
cp .env.example .env.local      # fyll inn DATABASE_URL (med database-passord)
npm run dev                      # http://localhost:3000
```

## Deploy på Vercel
1. **Importer repoet** i Vercel.
2. Sett **Root Directory = `dashboard`** (appen ligger i en undermappe).
3. Legg til Environment Variable **`DATABASE_URL`**:
   ```
   postgresql://postgres.<ref>:<PASSORD>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
   ```
   Bruk **transaction-pooler (port 6543)** for serverless. (`prepare:false` er
   satt i `lib/db.ts` slik dette krever.)
4. Deploy. Framework (Next.js) detekteres automatisk.

## Databaseobjekter
Dashboardet bruker materialiserte views og søke-indekser definert i
[`../db/dashboard.sql`](../db/dashboard.sql). Kjør den én gang mot databasen, og
`REFRESH MATERIALIZED VIEW …` (se bunnen av fila) etter hver nye datainnlasting.

## Legge til en ny fane
1. Lag `app/<slug>/page.tsx` (server-komponent som henter data via `sql` fra `lib/db`).
2. Legg til en linje i `lib/tabs.ts`.

Det er alt – fanen dukker opp i toppmenyen automatisk.
