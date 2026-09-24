import type { Settings, ShippingSetting } from "@/lib/settings";

export type ShippingId = keyof Settings["shipping"];
export type PaymentId = keyof Settings["payment"];

export type ShippingMethod = ShippingSetting & { id: ShippingId };
export type PaymentMethod = { id: PaymentId; name: string; description: string };

const PAYMENT_NAME: Record<PaymentId, string> = {
  karta: "Kartou online",
  prevod: "Bankovním převodem",
  hotove: "Na místě",
};

/** Zapnuté způsoby dodání z nastavení. */
export function shippingMethods(s: Settings): ShippingMethod[] {
  return (Object.keys(s.shipping) as ShippingId[])
    .map((id) => ({ id, ...s.shipping[id] }))
    .filter((m) => m.enabled);
}

/** Zapnuté způsoby platby z nastavení. */
export function paymentMethods(s: Settings): PaymentMethod[] {
  return (Object.keys(s.payment) as PaymentId[])
    .filter((id) => s.payment[id].enabled)
    .map((id) => ({ id, name: PAYMENT_NAME[id], description: s.payment[id].description }));
}

export function shippingPrice(method: ShippingSetting, subtotalCzk: number) {
  if (method.freeFromCzk !== null && subtotalCzk >= method.freeFromCzk) return 0;
  return method.priceCzk;
}

/** Nejbližší rozvozové dny (datum ISO), od zítřka. */
export function nextDeliveryDays(days: number[], count = 4, from = new Date()): string[] {
  const out: string[] = [];
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  for (let i = 0; i < 30 && out.length < count; i++) {
    if (days.includes(d.getDay())) out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}
