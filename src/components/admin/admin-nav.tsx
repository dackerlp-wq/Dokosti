"use client";

import { BarChart3, Boxes, ChevronDown, ClipboardList, LogOut, Settings, ShoppingBag, Store, Sun, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/admin/login/actions";
import { SearchPalette } from "@/components/admin/search-palette";
import type { AdminRole } from "@/lib/admin";
import { ADMIN_SECTIONS, activeSection, canSee, isTabActive, type AdminSection } from "@/lib/admin-sections";

const ICON: Record<AdminSection["icon"], typeof Sun> = { dnes: Sun, kasa: Store, prodej: ShoppingBag, zbozi: Boxes, zakaznici: Users, provoz: ClipboardList, finance: Wallet, statistiky: BarChart3, nastaveni: Settings };

/** Menu používá vysoký kontrast a výrazný aktivní stav; rozložení je nezávislé na starém e-shopovém stylu. */
const item = (on: boolean, sub = false) =>
  `flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors ${sub ? "ml-2 min-h-9 pl-8" : "font-semibold"} ${on ? "bg-white/12 font-semibold text-white" : "text-white/72 hover:bg-white/8 hover:text-white"}`;

function Badge({ n }: { n?: number }) {
  if (!n) return null;
  return <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d7f36a] px-1.5 text-[11px] font-bold text-[#1c2e24]">{n}</span>;
}

/**
 * Boční menu jako celý strom (podle návrhu): Dnes a Kasa jako odkazy, Prodej / Zboží / Zákazníci / Provoz
 * jako skupiny s rozbalenými podpoložkami, dole Finance, Statistiky a Nastavení. Každá role vidí jen své.
 */
export function AdminNav({ role, badges = {} }: { role: AdminRole; badges?: Record<string, number> }) {
  const path = usePathname();
  const active = activeSection(path);
  const sections = ADMIN_SECTIONS.filter((s) => canSee(role, s));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ [active?.href ?? ""]: true });
  return (
    <>
      {/* Velká obrazovka: strom */}
      <nav aria-label="Administrace" className="admin-nav hidden flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4 md:flex">
        {sections.map((s) => {
          const Icon = ICON[s.icon];
          const tabs = (s.tabs ?? []).filter((t) => canSee(role, t));
          const sectionOn = active?.href === s.href;
          if (s.group && tabs.length > 0) {
            const isOpen = expanded[s.href] ?? sectionOn;
            const clusters = tabs.reduce<{ label?: string; tabs: typeof tabs }[]>((groups, tab) => {
              const label = tab.cluster;
              let current = groups[groups.length - 1];
              if (!current || current.label !== label) {
                current = { label, tabs: [] };
                groups.push(current);
              }
              current.tabs.push(tab);
              return groups;
            }, []);
            return (
              <div key={s.href} className={`mt-2 ${s.gap ? "border-t border-white/10 pt-3" : ""}`}>
                <button type="button" onClick={() => setExpanded((state) => ({ ...state, [s.href]: !isOpen }))} aria-expanded={isOpen} className={`flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[.11em] transition hover:bg-white/8 ${sectionOn ? "text-[#d7f36a]" : "text-white/55"}`}>
                  <Icon strokeWidth={1.8} className="size-4" aria-hidden />
                  {s.label}
                  <ChevronDown className={`ml-auto size-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
                </button>
                {isOpen && clusters.map((cluster, index) => (
                  <div key={`${s.href}-${cluster.label ?? index}`} className={index ? "mt-2" : ""}>
                    {cluster.label && <p className="px-3 pb-1 pt-2 text-[9px] font-semibold uppercase tracking-[.14em] text-white/35">{cluster.label}</p>}
                    {cluster.tabs.map((t) => {
                      const on = isTabActive(t, path);
                      return (
                        <Link key={t.href} href={t.href} aria-current={on ? "page" : undefined} className={item(on, true)}>
                          <span className={`size-1.5 rounded-full ${on ? "bg-[#d7f36a]" : "bg-white/20"}`} aria-hidden />
                          {t.label}
                          <Badge n={badges[t.href]} />
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          }
          return (
            <Link key={s.href} href={s.href} aria-current={sectionOn ? "page" : undefined} className={`${item(sectionOn)} ${s.gap ? "mt-3 border-t border-white/10 pt-4" : ""}`}>
              <Icon strokeWidth={1.8} className="size-4" aria-hidden />
              {s.label}
              <Badge n={badges[s.href] ?? tabs.reduce((n, t) => n + (badges[t.href] ?? 0), 0)} />
            </Link>
          );
        })}
      </nav>
      {/* Mobil: řádek oddílů, podpoložky jsou v záložkách nad obsahem */}
      <nav aria-label="Administrace" className="admin-mobile-nav flex gap-1 overflow-x-auto border-b border-line bg-white px-3 pb-2 md:hidden">
        {sections.map((s) => {
          const Icon = ICON[s.icon];
          const on = active?.href === s.href;
          const tabs = (s.tabs ?? []).filter((t) => canSee(role, t));
          const badge = badges[s.href] ?? tabs.reduce((n, t) => n + (badges[t.href] ?? 0), 0);
          return (
          <Link key={s.href} href={s.href} aria-current={on ? "page" : undefined} className={`shrink-0 rounded-full ${on ? "bg-green text-white" : "text-muted"} flex items-center gap-2 px-3 py-2 text-sm font-semibold`}>
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

/** Pevný horní pruh s aktuální oblastí a globálním hledáním. */
export function AdminTopbar() {
  const path = usePathname();
  const section = activeSection(path);
  return (
    <header className="admin-topbar flex min-h-[68px] items-center justify-between gap-4 border-b border-line bg-white px-5 md:px-8">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted">Administrace <span className="px-1 text-line">/</span> <span className="text-green">{section?.label ?? "Dnes"}</span></p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden w-[min(34vw,360px)] md:block"><SearchPalette /></div>
        <Link href="/admin/kasa" className="admin-top-action inline-flex min-h-10 items-center rounded-lg bg-green px-4 text-sm font-semibold text-white transition hover:bg-green-hover">Otevřít kasu</Link>
      </div>
    </header>
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
  const [menuOpen, setMenuOpen] = useState(false);
  if (tabs.length < 2) return null;
  if (section?.group) {
    const current = tabs.find((t) => isTabActive(t, path));
    const clusters = tabs.reduce<{ label?: string; tabs: typeof tabs }[]>((groups, tab) => {
      let group = groups[groups.length - 1];
      if (!group || group.label !== tab.cluster) {
        group = { label: tab.cluster, tabs: [] };
        groups.push(group);
      }
      group.tabs.push(tab);
      return groups;
    }, []);
    return (
      <div className="relative z-10 mb-5 md:hidden">
        <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} className="flex min-h-11 w-full items-center justify-between rounded-lg border border-line bg-white px-3.5 text-left text-sm font-semibold text-green shadow-sm">
          <span><span className="mr-2 text-xs font-medium text-muted">{section.label}</span>{current?.label ?? "Vyberte část"}</span>
          <ChevronDown className={`size-4 transition-transform ${menuOpen ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {menuOpen && <div className="absolute left-0 right-0 top-12 max-h-[65vh] overflow-y-auto rounded-lg border border-line bg-white p-2 shadow-lg">
          {clusters.map((cluster, i) => <div key={`${cluster.label ?? "část"}-${i}`} className={i ? "mt-2 border-t border-line pt-2" : ""}>
            {cluster.label && <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted">{cluster.label}</p>}
            {cluster.tabs.map((tab) => {
              const on = isTabActive(tab, path);
              return <Link key={tab.href} href={tab.href} onClick={() => setMenuOpen(false)} aria-current={on ? "page" : undefined} className={`block rounded-md px-2.5 py-2 text-sm ${on ? "bg-paper font-semibold text-green" : "text-ink hover:bg-paper"}`}>{tab.label}</Link>;
            })}
          </div>)}
        </div>}
      </div>
    );
  }
  return (
    <div className="mb-5 flex gap-5 overflow-x-auto border-b border-line" role="tablist" aria-label={section?.label}>
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
