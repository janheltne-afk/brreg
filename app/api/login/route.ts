import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { hashPassord, signToken, COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

// Logg inn med brukernavn + passord mot brreg.app_bruker. Setter en signert
// cookie som identifiserer brukeren (brukes for bokmerker/rangering per bruker).
export async function POST(req: NextRequest) {
  const { brukernavn, passord } = await req.json().catch(() => ({ brukernavn: "", passord: "" }));
  const bn = (brukernavn ?? "").trim();
  if (!bn || !passord) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const hash = await hashPassord(passord);
    const [bruker] = await sql<{ brukernavn: string }[]>`
      select brukernavn from brreg.app_bruker
      where lower(brukernavn) = ${bn.toLowerCase()} and passord_hash = ${hash}`;
    if (!bruker) return NextResponse.json({ ok: false }, { status: 401 });

    const res = NextResponse.json({ ok: true, brukernavn: bruker.brukernavn });
    res.cookies.set(COOKIE, await signToken(bruker.brukernavn), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
