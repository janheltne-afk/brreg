"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function BrukerMeny() {
  const [brukernavn, setBrukernavn] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setBrukernavn(d.brukernavn ?? null))
      .catch(() => {});
  }, []);

  if (!brukernavn) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span style={{ color: "var(--muted)" }}>{brukernavn}</span>
      <button
        onClick={async () => {
          await fetch("/api/logout", { method: "POST" });
          router.replace("/login");
          router.refresh();
        }}
        className="rounded-lg px-2.5 py-1 text-xs font-medium hover:opacity-80"
        style={{ border: "1px solid var(--border)", color: "var(--muted)" }}
      >
        Logg ut
      </button>
    </div>
  );
}
