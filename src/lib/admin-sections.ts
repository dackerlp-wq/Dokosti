import { ADMIN_ROLE_RANK, type AdminRole } from "@/lib/admin";

/**
 * Struktura administrace: oddíly podle práce (Dnes, Kasa, Prodej, Zboží, Zákazníci, Provoz, Finance,
 * Statistiky, Nastavení), uvnitř záložky. Adresy stránek se nemění.
 * `access` je nejnižší role, která položku vidí: brigada < obsluha < spravce (výchozí obsluha).
 * Menu položky jen skrývá, stránky hlídá `requireAdmin()`.
 */
export type AdminTab = { href: string; label: string; access?: AdminRole };
export type AdminSection = {
  href: string;
  label: string;
  icon: "dnes" | "kasa" | "prodej" | "zbozi" | "zakaznici" | "provoz" | "finance" | "statistiky" | "nastaveni";
  access?: AdminRole;
  exact?: boolean;
  tabs?: AdminTab[];
};

export const ADMIN_SECTIONS: AdminSection[] = [
  { href: "/admin", label: "Dnes", icon: "dnes", exact: true, access: "brigada" },
  { href: "/admin/kasa", label: "Kasa", icon: "kasa", access: "brigada" },
  {
    href: "/admin/objednavky",
    label: "Prodej",
    icon: "prodej",
    tabs: [
      { href: "/admin/objednavky", label: "Objednávky" },
      { href: "/admin/rozvoz", label: "Rozvoz a odběry" },
      { href: "/admin/predplatne", label: "Předplatné", access: "spravce" },
    ],
  },
  {
    href: "/admin/produkty",
    label: "Zboží",
    icon: "zbozi",
    tabs: [
      { href: "/admin/produkty", label: "Produkty" },
      { href: "/admin/sklad", label: "Sklad" },
      { href: "/admin/sklad/pohyby", label: "Pohyby" },
      { href: "/admin/sklad/prijemky", label: "Příjemky" },
      { href: "/admin/nakup", label: "Objednávky u dodavatelů" },
      { href: "/admin/dodavatele", label: "Dodavatelé" },
      { href: "/admin/akce", label: "Akce a slevy", access: "spravce" },
    ],
  },
  {
    href: "/admin/zakaznici",
    label: "Zákazníci",
    icon: "zakaznici",
    tabs: [
      { href: "/admin/zakaznici", label: "Zákazníci" },
      { href: "/admin/karty", label: "Klub a karty" },
      { href: "/admin/poradna", label: "Poradna" },
    ],
  },
  {
    href: "/admin/ukoly",
    label: "Provoz",
    icon: "provoz",
    access: "brigada",
    tabs: [
      { href: "/admin/ukoly", label: "Úkoly", access: "brigada" },
      { href: "/admin/denik", label: "Deník změn" },
    ],
  },
  { href: "/admin/statistiky", label: "Statistiky", icon: "statistiky", access: "spravce" },
  {
    href: "/admin/nastaveni",
    label: "Nastavení",
    icon: "nastaveni",
    access: "spravce",
    tabs: [
      { href: "/admin/nastaveni", label: "Nastavení", access: "spravce" },
      { href: "/admin/uzivatele", label: "Uživatelé", access: "spravce" },
      { href: "/admin/emaily", label: "Odeslané e-maily", access: "spravce" },
      { href: "/admin/ucet", label: "Můj účet", access: "brigada" },
    ],
  },
];

export function canSee(role: AdminRole, item: { access?: AdminRole }): boolean {
  return ADMIN_ROLE_RANK[role] >= ADMIN_ROLE_RANK[item.access ?? "obsluha"];
}

/** Které cesty patří do oddílu: jeho adresa a adresy záložek (i s podstránkami). */
function belongs(section: AdminSection, path: string): boolean {
  const roots = [section.href, ...(section.tabs ?? []).map((t) => t.href)];
  return roots.some((r) => (r === "/admin" ? path === "/admin" : path === r || path.startsWith(r + "/")));
}

export function activeSection(path: string): AdminSection | undefined {
  return ADMIN_SECTIONS.find((s) => belongs(s, path));
}

export function isTabActive(tab: AdminTab, path: string): boolean {
  if (tab.href === "/admin") return path === "/admin";
  if (path === tab.href) return true;
  if (!path.startsWith(tab.href + "/")) return false;
  // Podstránka patří záložce jen tehdy, když ji nemá jiná, delší záložka (Sklad vs. Sklad/pohyby).
  return !ADMIN_SECTIONS.some((s) => (s.tabs ?? []).some((t) => t.href !== tab.href && t.href.startsWith(tab.href + "/") && (path === t.href || path.startsWith(t.href + "/"))));
}
