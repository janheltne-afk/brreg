import { NextRequest, NextResponse } from "next/server";
import { hentBransjeDetaljBySlug } from "@/lib/forretningsprosesserQuery";
import { hentSeedBransjeDetalj } from "@/lib/forretningsprosesserSeed";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const detalj = await hentBransjeDetaljBySlug(slug);
    if (detalj && detalj.prosesser.length > 0) return NextResponse.json(detalj);

    const seed = hentSeedBransjeDetalj(slug);
    if (seed) return NextResponse.json(seed);

    return NextResponse.json({ error: "Bransje ikke funnet" }, { status: 404 });
  } catch {
    const seed = hentSeedBransjeDetalj(slug);
    if (seed) return NextResponse.json(seed);

    return NextResponse.json({ error: "Bransje ikke funnet" }, { status: 404 });
  }
}
