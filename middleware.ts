import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Enkel passordsperre: uten gyldig innloggings-cookie sendes alt til /login.
// Selve passordsjekken skjer server-side i /api/login (passordet ligger aldri
// i nettleseren). Cookie-en holder deg innlogget i 30 dager.
const COOKIE = "brreg_auth";
const TOKEN = "ok";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = req.cookies.get(COOKIE)?.value === TOKEN;

  if (authed || pathname === "/login" || pathname === "/api/login") {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("retur", pathname);
  return NextResponse.redirect(url);
}

// Kjør på alle sider/ruter unntatt Next sine statiske ressurser.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
