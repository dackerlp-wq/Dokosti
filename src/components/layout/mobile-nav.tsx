"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { NAV } from "@/lib/site";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? "Zavřít menu" : "Otevřít menu"}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-control)] text-cream hover:bg-green-hover"
      >
        {open ? <X strokeWidth={1.75} /> : <Menu strokeWidth={1.75} />}
      </button>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Hlavní"
          className="absolute inset-x-0 z-20 border-t border-green-hover bg-green"
        >
          <ul className="container-dk flex flex-col py-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="label flex min-h-12 items-center text-cream hover:bg-green-hover"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
