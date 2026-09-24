/**
 * Způsoby doručení. Mražené zboží jde jen osobním odběrem, rozvozem
 * nebo chlazeným přepravcem. Ceny a limity jsou placeholdery.
 */
export type ShippingMethod = {
  id: "odber" | "rozvoz" | "prepravce";
  name: string;
  description: string;
  priceCzk: number;
  /** Od jaké hodnoty objednávky je doprava zdarma. */
  freeFromCzk: number | null;
  /** Minimální hodnota objednávky pro tento způsob. */
  minOrderCzk: number;
  /** Zda způsob zvládne mražené a chlazené zboží. */
  cold: boolean;
};

export const SHIPPING: ShippingMethod[] = [
  {
    id: "odber",
    name: "Osobní odběr v prodejně",
    description: "Připravíme do mrazáku, vyzvednete v otevírací době. Zaplatíte na místě nebo předem.",
    priceCzk: 0,
    freeFromCzk: null,
    minOrderCzk: 0,
    cold: true,
  },
  {
    id: "rozvoz",
    name: "Rozvoz po Kladně a okolí",
    description: "Vozíme sami, v chladicím boxu. Domluvíme den a hodinu.",
    priceCzk: 79,
    freeFromCzk: 1500,
    minOrderCzk: 500,
    cold: true,
  },
  {
    id: "prepravce",
    name: "Chlazený přepravce po ČR",
    description: "Balík v polystyrenu se suchým ledem. Posíláme pondělí až středa, aby nestál přes víkend.",
    priceCzk: 249,
    freeFromCzk: 3000,
    minOrderCzk: 1000,
    cold: true,
  },
];

export const PAYMENT = [
  { id: "karta", name: "Kartou online", description: "Platební brána (bude doplněno)." },
  { id: "prevod", name: "Bankovním převodem", description: "Údaje pošleme e-mailem, odesíláme po připsání." },
  { id: "hotove", name: "Na místě", description: "Hotově nebo kartou při odběru či rozvozu." },
] as const;

export type PaymentId = (typeof PAYMENT)[number]["id"];

export function shippingPrice(method: ShippingMethod, subtotalCzk: number) {
  if (method.freeFromCzk !== null && subtotalCzk >= method.freeFromCzk) return 0;
  return method.priceCzk;
}
