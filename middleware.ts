import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, COOKIE } from "@/lib/auth";

// Krever gyldig innloggings-cookie (signert med brukernavn). Uten den sendes
// alt til /login. Selve passordsjekken skjer i /api/login.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") {
    return NextResponse.next();
  }

  const brukernavn = await verifyToken(req.cookies.get(COOKIE)?.value);
  if (brukernavn) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("retur", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
