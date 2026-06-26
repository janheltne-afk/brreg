import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const brukernavn = await verifyToken(req.cookies.get(COOKIE)?.value);
  return NextResponse.json({ brukernavn });
}
