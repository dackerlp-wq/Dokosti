/**
 * Údaje o prodejně. Hodnoty v hranatých závorkách jsou placeholdery
 * z BRAND.md, doplní se po ověření.
 */
export const SITE = {
  name: "DoKosti BARF",
  brand: "DoKosti",
  slogan: "Poctivé do kosti.",
  domain: "[DOMENA]",
  handle: "[HANDLE]",
  address: "[ADRESA], Kladno",
  phone: "[TELEFON]",
  email: "[E-MAIL]",
  ico: "[IČO]",
  openingHours: [
    { days: "Po–Pá", hours: "[OTEVÍRACÍ DOBA]" },
    { days: "So", hours: "[OTEVÍRACÍ DOBA]" },
    { days: "Ne", hours: "zavřeno" },
  ],
} as const;

export const NAV = [
  { href: "/rada/zaklad", label: "Základ" },
  { href: "/rada/kosti", label: "Kosti" },
  { href: "/rada/navic", label: "Navíc" },
  { href: "/rada/mlsky", label: "Mlsky" },
  { href: "/doprava", label: "Doprava" },
  { href: "/o-nas", label: "O nás" },
] as const;
