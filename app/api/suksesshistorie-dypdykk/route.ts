import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

// Utfyllende AI-dypdykk om en person, forankret i registerdataene. Caches i
// brreg.suksess_dypdykk så hver person bare genereres én gang. Krever
// miljøvariabelen ANTHROPIC_API_KEY (settes i Vercel) – uten den er funksjonen
// av, og knappen viser en melding i stedet.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const navn: string = (body.navn ?? "").trim();
  const force: boolean = body.force === true;
  const kunCache: boolean = body.kunCache === true; // hent kun lagret, ikke generer
  if (!navn) return NextResponse.json({ error: "navn mangler" }, { status: 400 });

  try {
    if (!force) {
      const [rad] = await sql<{ tekst: string }[]>`
        select tekst from brreg.suksess_dypdykk where navn = ${navn}`;
      if (rad?.tekst) return NextResponse.json({ tekst: rad.tekst, cached: true });
    }
    if (kunCache) return NextResponse.json({ tekst: null });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "no_key", melding: "AI-dypdykk er ikke aktivert. Legg til miljøvariabelen ANTHROPIC_API_KEY i Vercel for å skru det på." },
        { status: 503 }
      );
    }

    const fakta: string = (body.fakta ?? "").toString().slice(0, 4000);
    const prompt =
      `Du er en nøktern norsk finansjournalist. Skriv en utfyllende, men edruelig profil av ` +
      `${navn}${body.fodselsaar ? ` (født ${body.fodselsaar})` : ""}, bransje: ${body.bransje ?? "ukjent"}.\n\n` +
      `Bruk denne dokumenterte registerdataen som grunnlag (fra norske offentlige registre):\n${fakta || "(lite registerdata funnet – personen holder trolig formue via holdingselskap eller utenlandske strukturer)"}\n\n` +
      `Struktur (bruk korte avsnitt med ledetekster):\n` +
      `1. Anslått formue – et grovt anslag i norske kroner, tydelig merket som anslag.\n` +
      `2. Tidslinje – når og hvordan de startet, viktige milepæler, vekst, og når/hvordan de hentet inn investorer eller kapital.\n` +
      `3. Slik bygde de det – forretningsmodell og metoder (holdingstruktur/fritaksmetoden, giring/lån, eksterne investorer) der det er relevant.\n` +
      `4. Vurdering – hva man kan anta om strategien deres.\n\n` +
      `Viktig: Skill tydelig mellom dokumenterte fakta og antakelser. Bruk ord som "trolig", "sannsynligvis", ` +
      `"anslagsvis" når noe ikke er sikkert. Ikke fremsett useriøse eller injurierende påstander. ` +
      `Skriv på norsk, 200–350 ord, ren tekst uten markdown-overskrifter.`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return NextResponse.json({ error: "ai_feil", melding: `AI-tjenesten svarte ${r.status}.`, detalj: t.slice(0, 200) }, { status: 502 });
    }
    const data = await r.json();
    const tekst: string = (data?.content?.[0]?.text ?? "").trim();
    if (!tekst) return NextResponse.json({ error: "tomt_svar" }, { status: 502 });

    await sql`
      insert into brreg.suksess_dypdykk (navn, tekst, generert) values (${navn}, ${tekst}, now())
      on conflict (navn) do update set tekst = excluded.tekst, generert = now()`;

    return NextResponse.json({ tekst, cached: false });
  } catch {
    return NextResponse.json({ error: "feil" }, { status: 500 });
  }
}
