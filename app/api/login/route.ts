import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Passordet ligger server-side. Endre det i Vercel via miljøvariabelen
// APP_PASSWORD uten å røre koden; standard er "admin".
const PASSORD = process.env.APP_PASSWORD || "admin";

export async function POST(req: NextRequest) {
  const { passord } = await req.json().catch(() => ({ passord: "" }));
  if (passord !== PASSORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("brreg_auth", "ok", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dager
  });
  return res;
}
