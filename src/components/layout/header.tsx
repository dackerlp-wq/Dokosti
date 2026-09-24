import Link from "next/link";
import { CartLink } from "@/components/cart/cart-link";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Logo } from "@/components/ui/logo";
import { NAV } from "@/lib/site";

export function Header() {
  return (
    <header className="relative bg-green text-cream">
      <div className="container-dk flex min-h-[72px] items-center justify-between gap-4 py-3">
        <Link href="/" className="shrink-0" aria-label="DoKosti BARF, úvodní stránka">
          {/* Desktop: logo bez podtitulu (min. 150 px). Mobil: jen nápis s kostí. */}
          <span className="hidden md:block">
            <Logo variant="bez-podtitulu-negativ" width={150} priority />
          </span>
          <span className="md:hidden">
            <Logo variant="napis-negativ" width={120} priority />
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Hlavní">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="label inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 hover:bg-green-hover"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <CartLink onGreen />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
