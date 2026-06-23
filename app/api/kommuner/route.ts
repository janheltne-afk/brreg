import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function GET() {
  try {
    const kommuner = await sql<{ kommune: string; antall: number }[]>`
      select kommune, antall from brreg.dash_kommuner order by kommune`;
    return NextResponse.json({ kommuner });
  } catch {
    return NextResponse.json({ kommuner: [] });
  }
}
