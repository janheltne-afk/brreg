import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyToken, COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

async function bruker(req: NextRequest) {
  return verifyToken(req.cookies.get(COOKIE)?.value);
}

export async function GET(req: NextRequest) {
  const bn = await bruker(req);
  if (!bn) return NextResponse.json({ rangering: {} }, { status: 401 });
  try {
    const rader = await sql<{ navn: string; verdi: number }[]>`
      select navn, verdi from brreg.app_rangering where brukernavn = ${bn}`;
    const r: Record<string, number> = {};
    for (const x of rader) r[x.navn] = x.verdi;
    return NextResponse.json({ rangering: r });
  } catch {
    return NextResponse.json({ rangering: {} });
  }
}

export async function POST(req: NextRequest) {
  const bn = await bruker(req);
  if (!bn) return NextResponse.json({ ok: false }, { status: 401 });
  const { navn, verdi } = await req.json().catch(() => ({}));
  if (!navn) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    if (verdi == null) {
      await sql`delete from brreg.app_rangering where brukernavn = ${bn} and navn = ${navn}`;
    } else {
      await sql`
        insert into brreg.app_rangering (brukernavn, navn, verdi) values (${bn}, ${navn}, ${Number(verdi)})
        on conflict (brukernavn, navn) do update set verdi = excluded.verdi`;
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
