#!/usr/bin/env python3
"""Strøm-konverter en (stor) JSON-array til NDJSON (én kompakt JSON pr. linje).
Lavt minneforbruk – holder bare ett objekt + en lesebuffer om gangen.
Bruk:  python json_array_to_ndjson.py input[.json|.gz] output[.ndjson|.gz]
"""
import sys, gzip, io, json

def opener_in(p):
    return io.TextIOWrapper(gzip.open(p, "rb"), encoding="utf-8") if p.endswith(".gz") else open(p, encoding="utf-8")
def opener_out(p):
    return io.TextIOWrapper(gzip.open(p, "wb"), encoding="utf-8") if p.endswith(".gz") else open(p, "w", encoding="utf-8")

def main(src, dst, chunk=1 << 20):
    dec = json.JSONDecoder()
    fin, fout = opener_in(src), opener_out(dst)
    buf, started, n = "", False, 0
    while True:
        # fyll buffer ved behov
        data = fin.read(chunk)
        if data:
            buf += data
        # hopp over ledende whitespace / '[' / ','
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
                print(f"Ferdig: {n} objekter")
                return
            # prøv å dekode ett objekt
            try:
                obj, idx = dec.raw_decode(buf)
            except ValueError:
                break  # ufullstendig – les mer
            fout.write(json.dumps(obj, ensure_ascii=False)); fout.write("\n")
            n += 1
            buf = buf[idx:]
        if not data:
            fout.close(); fin.close()
            print(f"Ferdig (EOF): {n} objekter")
            return

if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("Bruk: python json_array_to_ndjson.py input output")
    main(sys.argv[1], sys.argv[2])
