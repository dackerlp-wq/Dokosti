"use client";

import { BarChart3, Boxes, LayoutDashboard, LogOut, Mail, MessageCircleQuestion, Repeat, Settings, ShoppingBag, Store, Tag, Truck, Users, Warehouse } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/admin/login/actions";

/** Položky jen pro správce mají manager: true; obsluha vidí zbytek. */
const ITEMS = [
  { href: "/admin", label: "Přehled", icon: LayoutDashboard, exact: true },
  { href: "/admin/kasa", label: "Kasa", icon: Store },
  { href: "/admin/objednavky", label: "Objednávky", icon: ShoppingBag },
  { href: "/admin/rozvoz", label: "Rozvoz a odběry", icon: Truck },
  { href: "/admin/predplatne", label: "Předplatné", icon: Repeat, manager: true },
  { href: "/admin/produkty", label: "Produkty", icon: Boxes },
  { href: "/admin/sklad", label: "Sklad", icon: Warehouse },
  { href: "/admin/zakaznici", label: "Zákazníci", icon: Users },
  { href: "/admin/slevy", label: "Slevové kódy", icon: Tag, manager: true },
  { href: "/admin/emaily", label: "E-maily", icon: Mail, manager: true },
  { href: "/admin/poradna", label: "Poradna", icon: MessageCircleQuestion },
  { href: "/admin/statistiky", label: "Statistiky", icon: BarChart3, manager: true },
  { href: "/admin/nastaveni", label: "Nastavení", icon: Settings, manager: true },
];

export function AdminNav({ manager = true }: { manager?: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="Administrace" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-2 md:pb-0">
      {ITEMS.filter((i) => manager || !i.manager).map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-sm ${
              active ? "bg-green text-cream" : "text-ink hover:bg-cream"
            }`}
          >
            <Icon strokeWidth={1.75} className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
      <form action={logout} className="md:hidden">
        <button type="submit" className="flex items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-sm text-brick-text">
          <LogOut strokeWidth={1.75} className="h-4 w-4" /> Odhlásit
        </button>
      </form>
    </nav>
  );
}
