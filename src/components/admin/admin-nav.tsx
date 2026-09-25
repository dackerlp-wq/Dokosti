"use client";

import { BarChart3, Boxes, LayoutDashboard, LogOut, Mail, Settings, ShoppingBag, Tag, Truck, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/admin/login/actions";

const ITEMS = [
  { href: "/admin", label: "Přehled", icon: LayoutDashboard, exact: true },
  { href: "/admin/objednavky", label: "Objednávky", icon: ShoppingBag },
  { href: "/admin/rozvoz", label: "Rozvoz a odběry", icon: Truck },
  { href: "/admin/produkty", label: "Produkty a sklad", icon: Boxes },
  { href: "/admin/zakaznici", label: "Zákazníci", icon: Users },
  { href: "/admin/slevy", label: "Slevové kódy", icon: Tag },
  { href: "/admin/emaily", label: "E-maily", icon: Mail },
  { href: "/admin/statistiky", label: "Statistiky", icon: BarChart3 },
  { href: "/admin/nastaveni", label: "Nastavení", icon: Settings },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Administrace" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-2 md:pb-0">
      {ITEMS.map(({ href, label, icon: Icon, exact }) => {
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
