"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SearchForm } from "@/components/layout/search-form";
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
        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-[var(--radius-control)] text-green hover:bg-cream"
      >
        {open ? <X strokeWidth={1.75} /> : <Menu strokeWidth={1.75} />}
      </button>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Hlavní"
          className="absolute inset-x-0 z-20 border-t border-line bg-paper"
        >
          <div className="container-dk pt-3">
            <SearchForm />
          </div>
          <ul className="container-dk flex flex-col py-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="label flex min-h-11 items-center text-green hover:bg-cream"
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
