"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PAGE_NAV } from "@/lib/site";

type MenuItem = { href: string; label: string; meats: { key: string; label: string }[] };

export function MobileNav({ menu }: { menu: MenuItem[] }) {
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
              {menu.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} onClick={close} className="label flex min-h-11 items-center text-green hover:bg-cream">
                    {item.label}
                  </Link>
                  {item.meats.length > 0 && (
                    <ul className="mb-2 flex flex-wrap gap-1.5 pl-3">
                      {item.meats.map((m) => (
                        <li key={m.key}>
                          <Link href={`${item.href}/${m.key}`} onClick={close} className="inline-flex min-h-8 items-center rounded-full border border-line bg-cream px-2.5 text-xs capitalize text-ink">
                            {m.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
              <li>
                <Link href="/krmeni-na-miru" onClick={close} className="label flex min-h-11 items-center text-brick-text hover:bg-cream">
                  Krmení na míru
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
