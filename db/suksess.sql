-- Cache for AI-genererte dypdykk i Suksesshistorier-fanen. Hver person genereres
-- bare én gang (via /api/suksesshistorie-dypdykk, krever ANTHROPIC_API_KEY).
CREATE TABLE IF NOT EXISTS brreg.suksess_dypdykk (
    navn     TEXT PRIMARY KEY,
    tekst    TEXT,
    generert TIMESTAMPTZ DEFAULT now()
);
