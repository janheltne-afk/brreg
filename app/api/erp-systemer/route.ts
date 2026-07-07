import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

// Kun ERP-systemer med minst ett registrert selskap vises i filteret –
// masterlista i brreg.erp_systemer inneholder mange flere enn det faktisk
// finnes data på.
export async function GET() {
  try {
    const systemer = await sql<{ erp_system: string; antall: string }[]>`
      select erp_system, count(*) as antall
      from brreg.selskap_erp
      group by erp_system
      order by antall desc, erp_system`;
    return NextResponse.json({ systemer });
  } catch {
    return NextResponse.json({ systemer: [] });
  }
}
