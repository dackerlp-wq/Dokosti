/** Neměnné údaje značky. Provozní údaje (adresa, telefon, otevírací doba) jsou v nastavení (lib/settings). */
export const SITE = {
  name: "DoKosti BARF",
  brand: "DoKosti",
  slogan: "Poctivé do kosti.",
} as const;

/** Řady produktů: hlavní lišta pod hlavičkou. */
export const CATEGORY_NAV = [
  { href: "/rada/zaklad", label: "Základ" },
  { href: "/rada/kosti", label: "Kosti" },
  { href: "/rada/navic", label: "Navíc" },
  { href: "/rada/mlsky", label: "Mlsky" },
  { href: "/rada/granule", label: "Granule" },
] as const;

/** Ostatní stránky: horní řádek hlavičky. */
export const PAGE_NAV = [
  { href: "/jak-zacit-s-barfem", label: "Jak začít" },
  { href: "/doprava", label: "Doprava" },
  { href: "/o-nas", label: "O nás" },
  { href: "/kontakt", label: "Kontakt" },
] as const;

export const NAV = [...CATEGORY_NAV, ...PAGE_NAV];
