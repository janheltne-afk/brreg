"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [passord, setPassord] = useState("");
  const [feil, setFeil] = useState(false);
  const [laster, setLaster] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLaster(true);
    setFeil(false);
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passord }),
    });
    setLaster(false);
    if (r.ok) {
      const retur = new URLSearchParams(window.location.search).get("retur") || "/";
      router.replace(retur.startsWith("/login") ? "/" : retur);
      router.refresh();
    } else {
      setFeil(true);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-5">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <h1 className="text-lg font-semibold">Logg inn</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Skriv inn passordet for å åpne dashbordet.
          </p>
        </div>
        <input
          type="password"
          value={passord}
          autoFocus
          onChange={(e) => setPassord(e.target.value)}
          placeholder="Passord"
          className="input"
        />
        {feil && (
          <p className="text-sm" style={{ color: "var(--accent2)" }}>
            Feil passord. Prøv igjen.
          </p>
        )}
        <button
          type="submit"
          disabled={laster || passord.length === 0}
          className="w-full rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {laster ? "Logger inn…" : "Logg inn"}
        </button>
      </form>
    </div>
  );
}
