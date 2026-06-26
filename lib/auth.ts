// Enkel bruker-autentisering med signert cookie (HMAC). Fungerer både i
// middleware (edge) og API-ruter (node) via Web Crypto. Hemmeligheten kan
// settes med AUTH_SECRET i Vercel; ellers brukes en standardverdi.

const SECRET = process.env.AUTH_SECRET || "brreg-standard-hemmelighet-bor-byttes";
const enc = new TextEncoder();

function hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(melding: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(melding)));
}

// SHA-256-hash av passord (med fast prefiks). Samme som seed i databasen.
export async function hashPassord(passord: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode("brreg:" + passord)));
}

// Lag signert token for en innlogget bruker.
export async function signToken(brukernavn: string): Promise<string> {
  const b = btoa(brukernavn);
  return `${b}.${await hmac(b)}`;
}

// Verifiser token og returner brukernavn, eller null hvis ugyldig.
export async function verifyToken(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const [b, sig] = token.split(".");
  if (!b || !sig) return null;
  if ((await hmac(b)) !== sig) return null;
  try {
    return atob(b);
  } catch {
    return null;
  }
}

export const COOKIE = "brreg_auth";
