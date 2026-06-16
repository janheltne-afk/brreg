#!/usr/bin/env python3
"""Forbereder full førstegangslast (seeding) av brreg-enheter.

Gjør tre ting:
  1. Laster ned hele enhetsregisteret (gzip JSON-array) fra brreg.
  2. Strøm-konverterer det til NDJSON (én enhet pr. linje) som Hop kan lese.
  3. Finner nåværende høyeste oppdateringsid (watermark å sette etter seeding).

Krever kun Python 3 (standardbibliotek). Bruk:

  python tools/seed-prep.py hop/seed/enheter.ndjson

Skriv ut watermark-verdien til slutt; bruk den som SEED_WATERMARK i seed-workflowen.
"""
import sys, os, gzip, io, json, time, urllib.request, urllib.error

LASTNED = "https://data.brreg.no/enhetsregisteret/api/enheter/lastned"
OPPD = "https://data.brreg.no/enhetsregisteret/api/oppdateringer/enheter"
GZ = "enheter_alle.json.gz"


def last_ned(url, dest, forsok=6):
    """Last ned med retry. brreg sin gateway kan svare 502/503/504 ved treg
    generering – da venter vi og prøver igjen. Hopper over hvis fila finnes."""
    if os.path.exists(dest) and os.path.getsize(dest) > 1_000_000:
        print(f"Bruker eksisterende fil: {dest} ({os.path.getsize(dest)/1e6:.0f} MB)")
        return
    for n in range(1, forsok + 1):
        try:
            print(f"Laster ned (forsøk {n}/{forsok}) {url} ...")
            req = urllib.request.Request(url, headers={"Accept": "application/gzip", "User-Agent": "brreg-hop-seed"})
            with urllib.request.urlopen(req, timeout=1800) as r, open(dest, "wb") as f:
                total = 0
                while True:
                    chunk = r.read(1 << 20)
                    if not chunk:
                        break
                    f.write(chunk)
                    total += len(chunk)
                    print(f"\r  {total/1e6:.0f} MB", end="", flush=True)
            print(f"\n  Ferdig: {total/1e6:.1f} MB -> {dest}")
            return
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ConnectionError) as e:
            vent = min(60, 5 * 2 ** (n - 1))
            print(f"\n  Feil ({e}). Venter {vent}s og prøver igjen ...")
            time.sleep(vent)
    raise SystemExit("Nedlasting feilet etter flere forsøk. Prøv igjen senere, "
                     "eller last ned fila manuelt (se README) og kjør på nytt.")


def konverter(gz, ndjson, chunk=1 << 20):
    print(f"Konverterer {gz} -> {ndjson} (NDJSON) ...")
    dec = json.JSONDecoder()
    fin = io.TextIOWrapper(gzip.open(gz, "rb"), encoding="utf-8")
    fout = open(ndjson, "w", encoding="utf-8")
    buf, started, n = "", False, 0
    while True:
        data = fin.read(chunk)
        if data:
            buf += data
        while True:
            buf = buf.lstrip()
            if not buf:
                break
            if buf[0] == "[" and not started:
                buf, started = buf[1:], True
                continue
            if buf[0] == ",":
                buf = buf[1:]
                continue
            if buf[0] == "]":
                fout.close(); fin.close()
                print(f"  Ferdig: {n} enheter")
                return n
            try:
                obj, idx = dec.raw_decode(buf)
            except ValueError:
                break
            fout.write(json.dumps(obj, ensure_ascii=False)); fout.write("\n")
            n += 1
            buf = buf[idx:]
        if not data:
            fout.close(); fin.close()
            print(f"  Ferdig (EOF): {n} enheter")
            return n


def finn_watermark():
    """Binærsøk etter høyeste oppdateringsid (page.totalElements avtar med id)."""
    def total(x):
        with urllib.request.urlopen(f"{OPPD}?oppdateringsid={x}&size=1", timeout=60) as r:
            return json.load(r)["page"]["totalElements"]
    lo, hi = 1, 1 << 31
    while hi - lo > 4:
        mid = (lo + hi) // 2
        lo, hi = (mid + 1, hi) if total(mid) > 1 else (lo, mid)
    # hent siste faktiske id i et lite vindu rundt lo
    with urllib.request.urlopen(f"{OPPD}?oppdateringsid={max(1, lo-200)}&size=500", timeout=60) as r:
        e = json.load(r)["_embedded"]["oppdaterteEnheter"]
    return e[-1]["oppdateringsid"] if e else lo


def main():
    if len(sys.argv) != 2:
        sys.exit("Bruk: python tools/seed-prep.py <ut-fil.ndjson>")
    ndjson = sys.argv[1]
    last_ned(LASTNED, GZ)
    konverter(GZ, ndjson)
    wm = finn_watermark()
    print("\n===========================================")
    print(f"NDJSON-fil:        {ndjson}")
    print(f"SEED_WATERMARK:    {wm}")
    print("===========================================")
    print("Kjør seed-workflowen med disse to verdiene som parametere.")


if __name__ == "__main__":
    main()
