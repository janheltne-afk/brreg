import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyToken, COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

async function bruker(req: NextRequest) {
  return verifyToken(req.cookies.get(COOKIE)?.value);
}

export async function GET(req: NextRequest) {
  const bn = await bruker(req);
  if (!bn) return NextResponse.json({ bokmerker: [] }, { status: 401 });
  try {
    const rader = await sql<{ type: string; nokkel: string; navn: string; orgnr: string | null; fodselsaar: string | null }[]>`
      select type, nokkel, navn, orgnr, fodselsaar from brreg.app_bokmerke
      where brukernavn = ${bn} order by opprettet desc`;
    return NextResponse.json({
      bokmerker: rader.map((r) => ({ type: r.type, key: r.nokkel, navn: r.navn, orgnr: r.orgnr ?? undefined, fodselsaar: r.fodselsaar })),
    });
  } catch {
    return NextResponse.json({ bokmerker: [] });
  }
}

export async function POST(req: NextRequest) {
  const bn = await bruker(req);
  if (!bn) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const b = body.b ?? {};
  if (!b.type || !b.key) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    if (body.fjern) {
      await sql`delete from brreg.app_bokmerke where brukernavn = ${bn} and type = ${b.type} and nokkel = ${b.key}`;
    } else {
      await sql`
        insert into brreg.app_bokmerke (brukernavn, type, nokkel, navn, orgnr, fodselsaar)
        values (${bn}, ${b.type}, ${b.key}, ${b.navn ?? b.key}, ${b.orgnr ?? null}, ${b.fodselsaar ?? null})
        on conflict (brukernavn, type, nokkel) do nothing`;
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
