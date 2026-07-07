import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const system = (req.nextUrl.searchParams.get("system") ?? "").trim();
  if (!system) return NextResponse.json({ selskaper: [] });

  try {
    const selskaper = await sql<
      {
        organisasjonsnummer: string;
        navn: string | null;
        forr_poststed: string | null;
        erp_scope: string | null;
        status: string | null;
        notat: string | null;
      }[]
    >`
      select e.organisasjonsnummer, e.navn, e.forr_poststed,
             se.erp_scope, se.status, se.notat
      from brreg.selskap_erp se
      left join brreg.enheter e on e.organisasjonsnummer = se.organisasjonsnummer
      where se.erp_system = ${system}
      order by coalesce(e.navn, se.organisasjonsnummer)`;
    return NextResponse.json({ selskaper });
  } catch {
    return NextResponse.json({ selskaper: [] });
  }
}
