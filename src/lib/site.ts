/** Neměnné údaje značky. Provozní údaje (adresa, telefon, otevírací doba) jsou v nastavení (lib/settings). */
export const SITE = {
  name: "DoKosti BARF",
  brand: "DoKosti",
  slogan: "Poctivé do kosti.",
} as const;

export const NAV = [
  { href: "/rada/zaklad", label: "Základ" },
  { href: "/rada/kosti", label: "Kosti" },
  { href: "/rada/navic", label: "Navíc" },
  { href: "/rada/mlsky", label: "Mlsky" },
  { href: "/rada/granule", label: "Granule" },
  { href: "/doprava", label: "Doprava" },
  { href: "/o-nas", label: "O nás" },
] as const;
