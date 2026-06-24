import type { Metadata } from "next";
import "./globals.css";
import { Tabs } from "@/components/Tabs";

export const metadata: Metadata = {
  title: "Brreg-dashboard",
  description: "Innsikt i enheter, regnskap og aksjonærer fra Brønnøysundregistrene",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb">
      <body>
        <header
          className="sticky top-0 z-20"
          style={{
            background: "rgba(7,11,22,0.72)",
            backdropFilter: "blur(14px)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className="mx-auto max-w-7xl px-5 py-3">
            <Tabs />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-5 py-7">{children}</main>
        <footer className="mx-auto max-w-7xl px-5 py-10 text-xs" style={{ color: "var(--muted)" }}>
          Data: Brønnøysundregistrene · Skatteetatens aksjonærregister.
        </footer>
      </body>
    </html>
  );
}
