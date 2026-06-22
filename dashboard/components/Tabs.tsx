"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tabs } from "@/lib/tabs";

export function Tabs() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1.5">
      {tabs.map((t) => {
        const href = `/${t.slug}`;
        const active = pathname === href || (pathname === "/" && t.slug === "oversikt");
        return (
          <Link key={t.slug} href={href} title={t.beskrivelse} className="tab" data-active={active}>
            {t.navn}
          </Link>
        );
      })}
    </nav>
  );
}
