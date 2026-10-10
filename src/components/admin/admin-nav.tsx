"use client";

import { BarChart3, Boxes, ClipboardList, LogOut, Settings, ShoppingBag, Store, Sun, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/admin/login/actions";
import type { AdminRole } from "@/lib/admin";
import { ADMIN_SECTIONS, activeSection, canSee, isTabActive, type AdminSection } from "@/lib/admin-sections";

const ICON: Record<AdminSection["icon"], typeof Sun> = { dnes: Sun, kasa: Store, prodej: ShoppingBag, zbozi: Boxes, zakaznici: Users, provoz: ClipboardList, finance: Wallet, statistiky: BarChart3, nastaveni: Settings };

/** Boční menu: oddíly podle práce. Každá role vidí jen své položky. */
export function AdminNav({ role, badges = {} }: { role: AdminRole; badges?: Record<string, number> }) {
  const path = usePathname();
  const active = activeSection(path);
  return (
    <nav aria-label="Administrace" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-2 md:pb-0">
      {ADMIN_SECTIONS.filter((s) => canSee(role, s)).map((s) => {
        const Icon = ICON[s.icon];
        const on = active?.href === s.href;
        const badge = badges[s.href];
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={on ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-sm ${on ? "bg-green text-cream" : "text-ink hover:bg-cream"}`}
          >
            <Icon strokeWidth={1.75} className="h-4 w-4" />
            {s.label}
            {badge ? <span className={`label ml-auto rounded-full px-2 text-[10px] ${on ? "bg-cream text-green" : "bg-brick text-cream"}`}>{badge}</span> : null}
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

/** Záložky oddílu nad obsahem stránky (jen kde oddíl nějaké má a role na ně dosáhne). */
export function SectionTabs({ role }: { role: AdminRole }) {
  const path = usePathname();
  const section = activeSection(path);
  const tabs = (section?.tabs ?? []).filter((t) => canSee(role, t));
  if (tabs.length < 2) return null;
  return (
    <div className="mb-5 flex gap-5 overflow-x-auto border-b border-line" role="tablist" aria-label={section?.label}>
      {tabs.map((t) => {
        const on = isTabActive(t, path);
        return (
          <Link key={t.href} href={t.href} role="tab" aria-selected={on} className={`label shrink-0 border-b-[3px] py-2.5 text-[12px] ${on ? "border-green text-green" : "border-transparent text-muted hover:text-green"}`}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
