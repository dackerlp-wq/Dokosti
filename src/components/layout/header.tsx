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
 * vpravo hledání, účet a košík. Celá nabídka se vejde až od 1440 px (hlavička se tam rozšíří na 1440 px a účet s košíkem jsou jen ikony);
 * pod 1440 px je nabídka v bočním panelu zprava a účet s košíkem mají od 640 px i popisek.
 */
export function Header({ menu }: { menu: MenuLine[] }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper">
      <div className="mx-auto flex h-17 max-w-site items-center gap-5 px-5 min-[1440px]:max-w-[1440px] min-[1440px]:gap-7.5">
        <Link href="/" className="shrink-0" aria-label="DoKosti BARF, úvodní stránka">
          {/* Nápis s kostí bez řádku BARF, výška 44 px (poměr 689:250). */}
          <Logo variant="napis" width={121} priority className="h-11 w-auto" />
        </Link>

        <nav className="hidden flex-1 min-[1440px]:block" aria-label="Nabídka">
          <CategoryMenu menu={menu} />
        </nav>

        <div className="ml-auto flex items-center gap-1 min-[1440px]:ml-0 min-[1440px]:gap-2.5">
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
