import { Search } from "lucide-react";
import Link from "next/link";
import { AccountLink } from "@/components/layout/account-link";
import { CartLink } from "@/components/cart/cart-link";
import { CategoryMenu } from "@/components/layout/category-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Logo } from "@/components/ui/logo";
import type { MenuLine } from "@/lib/menu";

/**
 * Bílá hlavička 60 px se stínem: nápis s kostí (44 px), řady produktů s mega menu a Krmení na míru,
 * vpravo hledání, účet a košík (mezi 992 a 1200 px jen ikony, ať se vejde šest řad). Pod 992 px se navigace schová do bočního panelu zprava.
 */
export function Header({ menu }: { menu: MenuLine[] }) {
  return (
    <header className="relative z-30 bg-white shadow-header">
      <div className="mx-auto flex h-15 max-w-site items-center gap-5 px-5 lg:gap-7.5">
        <Link href="/" className="shrink-0" aria-label="DoKosti BARF, úvodní stránka">
          {/* Nápis s kostí bez řádku BARF, výška 44 px (poměr 689:250). */}
          <Logo variant="napis" width={121} priority className="h-11 w-auto" />
        </Link>

        <nav className="hidden flex-1 lg:block" aria-label="Nabídka">
          <CategoryMenu menu={menu} />
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:ml-0 lg:gap-2.5">
          <Link href="/hledat" aria-label="Hledat" className="inline-flex size-10 items-center justify-center text-green transition-colors duration-300 hover:text-brick-text">
            <Search strokeWidth={1.75} className="size-6" aria-hidden />
          </Link>
          <AccountLink />
          <CartLink />
          <MobileNav menu={menu.map((l) => ({ href: l.href, label: l.name, meats: l.meats.map((m) => ({ key: m.key, label: m.label })) }))} />
        </div>
      </div>
    </header>
  );
}
