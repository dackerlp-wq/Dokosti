import { Search } from "lucide-react";
import Link from "next/link";
import { AccountLink } from "@/components/layout/account-link";
import { CartLink } from "@/components/cart/cart-link";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SearchBox } from "@/components/layout/search-box";
import { Logo } from "@/components/ui/logo";
import type { Product } from "@/lib/catalog";
import { CATEGORY_NAV, PAGE_NAV } from "@/lib/site";

/**
 * Hlavička ve dvou řádcích: nahoře logo, hledání, účet a košík s odkazy na ostatní
 * stránky; pod tím lišta s řadami produktů. Na mobilu se vše skládá do menu.
 */
export function Header({ products }: { products: Product[] }) {
  return (
    <header className="relative border-b border-line bg-paper">
      <div className="container-dk flex min-h-16 items-center gap-3 py-2 md:gap-6">
        <Link href="/" className="shrink-0" aria-label="DoKosti BARF, úvodní stránka">
          {/* Barevné logo bez podtitulu (min. 150 px). Na mobilu jen nápis s kostí. */}
          <span className="hidden md:block">
            <Logo variant="bez-podtitulu" width={150} priority />
          </span>
          <span className="md:hidden">
            <Logo variant="napis" width={110} priority />
          </span>
        </Link>

        <SearchBox products={products} className="hidden flex-1 md:block md:max-w-md" />

        <nav className="ml-auto hidden items-center gap-0.5 lg:flex" aria-label="Stránky">
          {PAGE_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="inline-flex min-h-10 items-center whitespace-nowrap rounded-[var(--radius-control)] px-2 text-sm text-muted hover:bg-cream hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-0.5 lg:ml-0">
          <Link href="/hledat" aria-label="Hledat" className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-[var(--radius-control)] text-green hover:bg-cream md:hidden">
            <Search strokeWidth={1.75} className="h-5 w-5" />
          </Link>
          <AccountLink />
          <CartLink />
          <MobileNav />
        </div>
      </div>

      <div className="hidden border-t border-line lg:block">
        <nav className="container-dk flex items-center gap-1" aria-label="Řady produktů">
          {CATEGORY_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="label inline-flex min-h-11 items-center whitespace-nowrap px-3 text-green hover:text-brick-text">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
