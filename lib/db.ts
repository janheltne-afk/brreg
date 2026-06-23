import postgres from "postgres";

// Lat singleton: klienten opprettes først når en spørring faktisk kjøres,
// slik at `next build` (som importerer modulene) ikke krever DATABASE_URL.
// `prepare: false` kreves for Supabase sin transaction-pooler (port 6543).
const globalForDb = globalThis as unknown as { _sql?: postgres.Sql };

function client(): postgres.Sql {
  if (globalForDb._sql) return globalForDb._sql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL mangler. Sett den i .env.local eller i Vercel Environment Variables."
    );
  }
  globalForDb._sql = postgres(url, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
    connection: { search_path: "brreg, public" },
  });
  return globalForDb._sql;
}

// Proxy som videresender tagged-template-kall og metoder til den late klienten.
export const sql = new Proxy(function () {} as unknown as postgres.Sql, {
  apply(_target, _thisArg, args: unknown[]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client() as any)(...args);
  },
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client() as any)[prop];
  },
}) as postgres.Sql;
