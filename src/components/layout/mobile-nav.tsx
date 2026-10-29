"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PAGE_NAV } from "@/lib/site";

type MenuItem = { href: string; label: string; meats: { key: string; label: string }[] };

/** Boční panel 300 px zprava pod 992 px: řady s druhy masa, Krmení na míru, ostatní stránky a účet. */
export function MobileNav({ menu }: { menu: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const row = "flex min-h-11 items-center text-nav text-green hover:text-brick-text";

  return (
    <div className="xl:hidden">
      <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="mobile-nav" aria-label="Otevřít menu" className="inline-flex size-10 items-center justify-center text-green">
        <Menu strokeWidth={1.75} className="size-6" aria-hidden />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Zavřít menu" onClick={close} className="absolute inset-0 bg-overlay" />
          <nav id="mobile-nav" aria-label="Hlavní" className="absolute inset-y-0 right-0 flex w-[min(300px,85vw)] flex-col overflow-y-auto bg-white shadow-menu">
            <div className="flex items-center justify-between border-b border-line px-5 py-2.5">
              <span className="text-eyebrow text-muted uppercase">Nabídka</span>
              <button type="button" onClick={close} aria-label="Zavřít menu" className="inline-flex size-10 items-center justify-center text-green">
                <X strokeWidth={1.75} className="size-6" aria-hidden />
              </button>
            </div>
            <ul className="px-5 py-2.5">
              {menu.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} onClick={close} className={row}>
                    {item.label}
                  </Link>
                  {item.meats.length > 0 && (
                    <ul className="mb-2.5 flex flex-wrap gap-1.25">
                      {item.meats.map((m) => (
                        <li key={m.key}>
                          <Link href={`${item.href}/${m.key}`} onClick={close} className="inline-flex min-h-8 items-center rounded-control bg-paper px-2.5 text-small text-ink hover:bg-cream">
                            {m.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
              <li>
                <Link href="/krmeni-na-miru" onClick={close} className={row}>
                  Krmení na míru
                </Link>
              </li>
            </ul>
            <ul className="border-t border-line px-5 py-2.5">
              {PAGE_NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} onClick={close} className="flex min-h-10 items-center text-small font-semibold text-ink hover:text-brick-text">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/ucet" onClick={close} className="flex min-h-10 items-center text-small font-semibold text-ink hover:text-brick-text">
                  Můj účet
                </Link>
              </li>
              <li>
                <Link href="/hledat" onClick={close} className="flex min-h-10 items-center text-small font-semibold text-ink hover:text-brick-text">
                  Hledat
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
