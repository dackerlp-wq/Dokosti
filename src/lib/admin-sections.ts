/**
 * Struktura administrace: sedm oddílů v menu, uvnitř záložky (stránky, které dřív byly samostatné položky).
 * Adresy stránek se nemění. Položky s `manager: true` vidí jen správce.
 */
export type AdminTab = { href: string; label: string; manager?: boolean };
export type AdminSection = { href: string; label: string; icon: "prehled" | "kasa" | "objednavky" | "zbozi" | "zakaznici" | "slevy" | "nastaveni"; manager?: boolean; exact?: boolean; tabs?: AdminTab[] };

export const ADMIN_SECTIONS: AdminSection[] = [
  { href: "/admin", label: "Přehled", icon: "prehled", exact: true, tabs: [{ href: "/admin", label: "Dnes" }, { href: "/admin/statistiky", label: "Statistiky", manager: true }] },
  { href: "/admin/kasa", label: "Kasa", icon: "kasa" },
  {
    href: "/admin/objednavky",
    label: "Objednávky",
    icon: "objednavky",
    tabs: [
      { href: "/admin/objednavky", label: "Objednávky" },
      { href: "/admin/rozvoz", label: "Rozvoz a odběry" },
      { href: "/admin/predplatne", label: "Předplatné", manager: true },
    ],
  },
  { href: "/admin/produkty", label: "Zboží a sklad", icon: "zbozi", tabs: [{ href: "/admin/produkty", label: "Produkty" }, { href: "/admin/sklad", label: "Sklad a příjemky" }] },
  {
    href: "/admin/zakaznici",
    label: "Zákazníci a klub",
    icon: "zakaznici",
    tabs: [
      { href: "/admin/zakaznici", label: "Zákazníci" },
      { href: "/admin/karty", label: "Karty" },
      { href: "/admin/poradna", label: "Poradna" },
    ],
  },
  { href: "/admin/slevy", label: "Slevy a akce", icon: "slevy", manager: true },
  {
    href: "/admin/nastaveni",
    label: "Nastavení",
    icon: "nastaveni",
    manager: true,
    tabs: [
      { href: "/admin/nastaveni", label: "Nastavení" },
      { href: "/admin/emaily", label: "Odeslané e-maily" },
      { href: "/admin/ucet", label: "Můj účet" },
    ],
  },
];

/** Které cesty patří do oddílu: jeho adresa a adresy záložek (i s podstránkami). */
function belongs(section: AdminSection, path: string): boolean {
  const roots = [section.href, ...(section.tabs ?? []).map((t) => t.href)];
  return roots.some((r) => (r === "/admin" ? path === "/admin" : path === r || path.startsWith(r + "/")));
}

export function activeSection(path: string): AdminSection | undefined {
  return ADMIN_SECTIONS.find((s) => belongs(s, path));
}

export function isTabActive(tab: AdminTab, path: string): boolean {
  return tab.href === "/admin" ? path === "/admin" : path === tab.href || path.startsWith(tab.href + "/");
}
