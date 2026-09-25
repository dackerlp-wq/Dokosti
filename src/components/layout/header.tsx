import Link from "next/link";
import { CartLink } from "@/components/cart/cart-link";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SearchForm } from "@/components/layout/search-form";
import { Search } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { NAV } from "@/lib/site";

export function Header() {
  return (
    <header className="relative border-b border-line bg-paper">
      <div className="container-dk flex min-h-16 items-center justify-between gap-4 py-2">
        <Link href="/" className="shrink-0" aria-label="DoKosti BARF, úvodní stránka">
          {/* Barevné logo bez podtitulu (min. 150 px). Na mobilu jen nápis s kostí. */}
          <span className="hidden md:block">
            <Logo variant="bez-podtitulu" width={150} priority />
          </span>
          <span className="md:hidden">
            <Logo variant="napis" width={110} priority />
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Hlavní">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="label inline-flex min-h-10 items-center whitespace-nowrap rounded-[var(--radius-control)] px-2 text-green hover:bg-cream"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <SearchForm className="hidden w-44 xl:block" />
          <Link href="/hledat" aria-label="Hledat" className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-[var(--radius-control)] text-green hover:bg-cream xl:hidden">
            <Search strokeWidth={1.75} className="h-5 w-5" />
          </Link>
          <CartLink />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
