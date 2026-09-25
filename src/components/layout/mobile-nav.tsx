"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CATEGORY_NAV, PAGE_NAV } from "@/lib/site";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Zavřít menu" : "Otevřít menu"}
        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-[var(--radius-control)] text-green hover:bg-cream"
      >
        {open ? <X strokeWidth={1.75} /> : <Menu strokeWidth={1.75} />}
      </button>

      {open && (
        <nav id="mobile-nav" aria-label="Hlavní" className="absolute inset-x-0 z-20 border-t border-line bg-paper">
          <div className="container-dk py-3">
            <p className="label mb-1 text-[11px] text-muted">Nabídka</p>
            <ul className="mb-3">
              {CATEGORY_NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} onClick={close} className="label flex min-h-11 items-center text-green hover:bg-cream">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/kalkulacka" onClick={close} className="label flex min-h-11 items-center text-brick-text hover:bg-cream">
                  Kalkulačka dávky
                </Link>
              </li>
            </ul>
            <p className="label mb-1 border-t border-line pt-3 text-[11px] text-muted">Informace</p>
            <ul>
              {PAGE_NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} onClick={close} className="flex min-h-10 items-center text-sm hover:bg-cream">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/ucet" onClick={close} className="flex min-h-10 items-center text-sm hover:bg-cream">
                  Můj účet
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      )}
    </div>
  );
}
