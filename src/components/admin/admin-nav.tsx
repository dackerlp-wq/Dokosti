"use client";

import { BarChart3, Boxes, ClipboardList, LogOut, Settings, ShoppingBag, Store, Sun, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/admin/login/actions";
import type { AdminRole } from "@/lib/admin";
import { ADMIN_SECTIONS, activeSection, canSee, isTabActive, type AdminSection } from "@/lib/admin-sections";

const ICON: Record<AdminSection["icon"], typeof Sun> = { dnes: Sun, kasa: Store, prodej: ShoppingBag, zbozi: Boxes, zakaznici: Users, provoz: ClipboardList, finance: Wallet, statistiky: BarChart3, nastaveni: Settings };

/** Položka menu: text-nav v zelené, aktivní na bílé v cihlové, podpoložky odsazené. */
const item = (on: boolean, sub = false) =>
  `flex items-center gap-2.5 rounded-control px-2.5 py-2 text-nav transition-colors duration-300 ${sub ? "pl-9 font-semibold" : ""} ${on ? "bg-white text-brick-text shadow-card" : "text-green hover:text-brick-text"}`;

function Badge({ n }: { n?: number }) {
  if (!n) return null;
  return <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brick px-1.5 text-xs font-bold text-white">{n}</span>;
}

/**
 * Boční menu jako celý strom (podle návrhu): Dnes a Kasa jako odkazy, Prodej / Zboží / Zákazníci / Provoz
 * jako skupiny s rozbalenými podpoložkami, dole Finance, Statistiky a Nastavení. Každá role vidí jen své.
 */
export function AdminNav({ role, badges = {} }: { role: AdminRole; badges?: Record<string, number> }) {
  const path = usePathname();
  const active = activeSection(path);
  const sections = ADMIN_SECTIONS.filter((s) => canSee(role, s));
  return (
    <>
      {/* Velká obrazovka: strom */}
      <nav aria-label="Administrace" className="hidden flex-col gap-0.5 px-2.5 md:flex">
        {sections.map((s) => {
          const Icon = ICON[s.icon];
          const tabs = (s.tabs ?? []).filter((t) => canSee(role, t));
          const sectionOn = active?.href === s.href;
          if (s.group && tabs.length > 0) {
            return (
              <div key={s.href} className="mt-2.5">
                <div className="flex items-center gap-2.5 px-2.5 py-2 text-eyebrow text-muted uppercase">
                  <Icon strokeWidth={1.75} className="size-4" aria-hidden />
                  {s.label}
                </div>
                {tabs.map((t) => {
                  const on = isTabActive(t, path);
                  return (
                    <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className={item(on, true)}>
                      {t.label}
                      <Badge n={badges[t.href]} />
                    </Link>
                  );
                })}
              </div>
            );
          }
          return (
            <Link key={s.href} href={s.href} aria-current={sectionOn ? "page" : undefined} className={`${item(sectionOn)} ${s.gap ? "mt-2.5" : ""}`}>
              <Icon strokeWidth={1.75} className="size-4" aria-hidden />
              {s.label}
              <Badge n={badges[s.href] ?? tabs.reduce((n, t) => n + (badges[t.href] ?? 0), 0)} />
            </Link>
          );
        })}
      </nav>
      {/* Mobil: řádek oddílů, podpoložky jsou v záložkách nad obsahem */}
      <nav aria-label="Administrace" className="flex gap-1 overflow-x-auto px-2 pb-2 md:hidden">
        {sections.map((s) => {
          const Icon = ICON[s.icon];
          const on = active?.href === s.href;
          const tabs = (s.tabs ?? []).filter((t) => canSee(role, t));
          const badge = badges[s.href] ?? tabs.reduce((n, t) => n + (badges[t.href] ?? 0), 0);
          return (
            <Link key={s.href} href={s.href} aria-current={on ? "page" : undefined} className={`shrink-0 ${item(on)}`}>
              <Icon strokeWidth={1.75} className="size-4" aria-hidden />
              {s.label}
              <Badge n={badge} />
            </Link>
          );
        })}
        <form action={logout}>
          <button type="submit" className="flex items-center gap-2 rounded-control px-3 py-2 text-nav text-brick-text">
            <LogOut strokeWidth={1.75} className="size-4" aria-hidden /> Odhlásit
          </button>
        </form>
      </nav>
    </>
  );
}

/**
 * Záložky oddílu nad obsahem. U skupin (podpoložky jsou v bočním menu) jen na mobilu,
 * u ostatních oddílů (Finance, Nastavení) vždy.
 */
export function SectionTabs({ role }: { role: AdminRole }) {
  const path = usePathname();
  const section = activeSection(path);
  const tabs = (section?.tabs ?? []).filter((t) => canSee(role, t));
  if (tabs.length < 2) return null;
  return (
    <div className={`mb-5 flex gap-5 overflow-x-auto border-b border-line ${section?.group ? "md:hidden" : ""}`} role="tablist" aria-label={section?.label}>
      {tabs.map((t) => {
        const on = isTabActive(t, path);
        return (
          <Link key={t.href} href={t.href} role="tab" aria-selected={on} className={`shrink-0 border-b-2 py-2.5 text-nav transition-colors duration-300 ${on ? "border-green text-green" : "border-transparent text-muted hover:text-brick-text"}`}>
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
