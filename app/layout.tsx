import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Tabs } from "@/components/Tabs";
import { BrukerMeny } from "@/components/BrukerMeny";

export const metadata: Metadata = {
  title: "Brreg-dashboard",
  description: "Innsikt i enheter, regnskap og aksjonærer fra Brønnøysundregistrene",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb">
      <body>
        <header className="app-header sticky top-0 z-20">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3">
            <Link href="/selskaper" className="brand-lockup" aria-label="Gå til selskaper">
              <span className="brand-mark">B</span>
              <span>
                <span className="brand-title">Brreg</span>
                <span className="brand-subtitle">Norsk selskapsinnsikt</span>
              </span>
            </Link>
            <Tabs />
            <BrukerMeny />
          </div>
        </header>
        <main className="app-main mx-auto max-w-7xl px-5 py-7">{children}</main>
        <footer className="app-footer mx-auto max-w-7xl px-5 py-10 text-xs">
          Data: Brønnøysundregistrene · Skatteetatens aksjonærregister.
        </footer>
      </body>
    </html>
  );
}
