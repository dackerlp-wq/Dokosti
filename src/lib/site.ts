/** Neměnné údaje značky. Provozní údaje (adresa, telefon, otevírací doba) jsou v nastavení (lib/settings). */
export const SITE = {
  name: "DoKosti BARF",
  brand: "DoKosti",
  slogan: "Poctivé do kosti.",
} as const;

/** Řady produktů: patička a záloha pro menu (lišta v hlavičce se staví z produktů, viz lib/menu.ts). */
export const CATEGORY_NAV = [
  { href: "/rada/barf", label: "BARF mixy" },
  { href: "/rada/maso", label: "Maso a vnitřnosti" },
  { href: "/rada/kosti", label: "Masité kosti" },
  { href: "/rada/mlsky", label: "Pamlsky a žvýkání" },
  { href: "/rada/navic", label: "Doplňky" },
  { href: "/rada/granule", label: "Granule a konzervy" },
] as const;

/** Ostatní stránky: horní řádek hlavičky. */
export const PAGE_NAV = [
  { href: "/jak-zacit-s-barfem", label: "Jak začít" },
  { href: "/doprava", label: "Doprava" },
  { href: "/o-nas", label: "O nás" },
  { href: "/kontakt", label: "Kontakt" },
] as const;

export const NAV = [...CATEGORY_NAV, ...PAGE_NAV];
