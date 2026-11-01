import { ADMIN_ROLE_RANK, type AdminRole } from "@/lib/admin";

/**
 * Struktura administrace podle pracovních toků (prodej, zásoby, zákazníci, provozovna a peníze).
 * Adresy stránek se nemění; seskupení ovlivňuje jen způsob, jak se k nim obsluha dostane.
 * `access` je nejnižší role, která položku vidí: brigada < obsluha < spravce (výchozí obsluha).
 * Menu položky jen skrývá, stránky hlídá `requireAdmin()`.
 */
export type AdminTab = { href: string; label: string; access?: AdminRole; cluster?: string };
export type AdminSection = {
  href: string;
  label: string;
  icon: "dnes" | "kasa" | "prodej" | "zbozi" | "zakaznici" | "provoz" | "finance" | "statistiky" | "nastaveni";
  access?: AdminRole;
  exact?: boolean;
  /** Záložky oddílu. Skupina (`group: true`) je v bočním menu rozbalená jako nadpis s podpoložkami, jinak je oddíl jeden odkaz a záložky jsou nad obsahem. */
  tabs?: AdminTab[];
  group?: boolean;
  /** Vizuálně oddělí samostatnou položku nebo spodní oblast navigace. */
  gap?: boolean;
};

export const ADMIN_SECTIONS: AdminSection[] = [
  { href: "/admin", label: "Dnes", icon: "dnes", exact: true, access: "brigada" },
  {
    href: "/admin/objednavky",
    label: "Prodej",
    icon: "prodej",
    group: true,
    tabs: [
      { href: "/admin/kasa", label: "Kasa", access: "brigada", cluster: "Prodej a výdej" },
      { href: "/admin/objednavky", label: "Objednávky", cluster: "Prodej a výdej" },
      { href: "/admin/rozvoz", label: "Rozvoz a odběry", cluster: "Doručení" },
      { href: "/admin/predplatne", label: "Pravidelné objednávky", access: "spravce", cluster: "Doručení" },
    ],
  },
  {
    href: "/admin/produkty",
    label: "Zboží a sklad",
    icon: "zbozi",
    group: true,
    tabs: [
      { href: "/admin/produkty", label: "Produkty", cluster: "Nabídka a ceny" },
      { href: "/admin/produkty/ceny", label: "Ceny a marže", access: "spravce", cluster: "Nabídka a ceny" },
      { href: "/admin/produkty/cenovky", label: "Cenovky", cluster: "Nabídka a ceny" },
      { href: "/admin/akce", label: "Akce a slevy", access: "spravce", cluster: "Nabídka a ceny" },
      { href: "/admin/sklad", label: "Přehled skladu", cluster: "Zásoby" },
      { href: "/admin/sklad/pohyby", label: "Pohyby zásob", cluster: "Zásoby" },
      { href: "/admin/sklad/inventura", label: "Inventura", cluster: "Zásoby" },
      { href: "/admin/sklad/prijemky", label: "Příjem zboží", cluster: "Zásoby" },
      { href: "/admin/nakup", label: "Nákupy u dodavatelů", cluster: "Zásobování" },
      { href: "/admin/dodavatele", label: "Dodavatelé", cluster: "Zásobování" },
    ],
  },
  {
    href: "/admin/zakaznici",
    label: "Zákazníci a klub",
    icon: "zakaznici",
    group: true,
    tabs: [
      { href: "/admin/zakaznici", label: "Zákaznická evidence", cluster: "Zákazníci" },
      { href: "/admin/karty", label: "Klub a věrnostní karty", cluster: "Věrnost a péče" },
      { href: "/admin/poukazy", label: "Dárkové poukazy", access: "spravce", cluster: "Věrnost a péče" },
      { href: "/admin/poradna", label: "Dotazy zákazníků", cluster: "Věrnost a péče" },
    ],
  },
  {
    href: "/admin/ukoly",
    label: "Provozovna",
    icon: "provoz",
    access: "brigada",
    group: true,
    tabs: [
      { href: "/admin/ukoly", label: "Úkoly", access: "brigada", cluster: "Denní provoz" },
      { href: "/admin/provoz", label: "Teploty a checklisty", access: "brigada", cluster: "Denní provoz" },
      { href: "/admin/kalendar", label: "Kalendář", access: "brigada", cluster: "Denní provoz" },
      { href: "/admin/smeny", label: "Směny a uzávěrky", cluster: "Směny a tým" },
      { href: "/admin/plan-smen", label: "Plán směn", access: "brigada", cluster: "Směny a tým" },
      { href: "/admin/dochazka", label: "Docházka", access: "brigada", cluster: "Směny a tým" },
      { href: "/admin/zamestnanci", label: "Zaměstnanci", access: "spravce", cluster: "Směny a tým" },
      { href: "/admin/dokumenty", label: "Dokumenty a smlouvy", access: "brigada", cluster: "Evidence a kontrola" },
      { href: "/admin/denik", label: "Historie změn", cluster: "Evidence a kontrola" },
    ],
  },
  {
    href: "/admin/finance",
    label: "Peníze a výsledky",
    icon: "finance",
    access: "spravce",
    group: true,
    gap: true,
    tabs: [
      { href: "/admin/finance", label: "Přehled peněz", access: "spravce", cluster: "Finance" },
      { href: "/admin/finance/vydaje", label: "Výdaje", access: "spravce", cluster: "Finance" },
      { href: "/admin/finance/splatnosti", label: "Splatnosti a přijaté platby", access: "spravce", cluster: "Finance" },
      { href: "/admin/mzdy", label: "Mzdy", access: "spravce", cluster: "Mzdy" },
      { href: "/admin/mzdy/parametry", label: "Nastavení mezd", access: "spravce", cluster: "Mzdy" },
      { href: "/admin/statistiky", label: "Prodejní statistiky", access: "spravce", cluster: "Výsledky" },
    ],
  },
  {
    href: "/admin/nastaveni",
    label: "Nastavení systému",
    icon: "nastaveni",
    access: "spravce",
    tabs: [
      { href: "/admin/nastaveni", label: "Provozní nastavení", access: "spravce", cluster: "Správa systému" },
      { href: "/admin/uzivatele", label: "Uživatelé a přístupy", access: "spravce", cluster: "Správa systému" },
      { href: "/admin/emaily", label: "Odeslané e-maily", access: "spravce", cluster: "Správa systému" },
    ],
  },
  { href: "/admin/ucet", label: "Můj účet", icon: "nastaveni", access: "brigada", exact: true, gap: true },
];

export function canSee(role: AdminRole, item: { access?: AdminRole }): boolean {
  return ADMIN_ROLE_RANK[role] >= ADMIN_ROLE_RANK[item.access ?? "obsluha"];
}

/** Jak dlouhá adresa oddílu (jeho nebo záložky) sedí na cestu; 0 = nepatří sem. Vyhrává nejdelší shoda (Mzdy vs. Parametry mezd). */
function matchLength(section: AdminSection, path: string): number {
  const roots = [section.href, ...(section.tabs ?? []).map((t) => t.href)];
  return roots.reduce((best, r) => {
    const hit = r === "/admin" ? path === "/admin" : path === r || path.startsWith(r + "/");
    return hit && r.length > best ? r.length : best;
  }, 0);
}

export function activeSection(path: string): AdminSection | undefined {
  let best: AdminSection | undefined;
  let bestLen = 0;
  for (const s of ADMIN_SECTIONS) {
    const n = matchLength(s, path);
    if (n > bestLen) {
      best = s;
      bestLen = n;
    }
  }
  return best;
}

export function isTabActive(tab: AdminTab, path: string): boolean {
  if (tab.href === "/admin") return path === "/admin";
  if (path === tab.href) return true;
  if (!path.startsWith(tab.href + "/")) return false;
  // Podstránka patří záložce jen tehdy, když ji nemá jiná, delší záložka (Sklad vs. Sklad/pohyby).
  return !ADMIN_SECTIONS.some((s) => (s.tabs ?? []).some((t) => t.href !== tab.href && t.href.startsWith(tab.href + "/") && (path === t.href || path.startsWith(t.href + "/"))));
}
