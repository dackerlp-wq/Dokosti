import type { LineSlug, ProductUnit } from "@/lib/catalog";

/** Produkt tak, jak ho potřebuje kasa (bez popisů). */
export type PosProduct = {
  id: string;
  slug: string;
  line: LineSlug;
  variant: string;
  unit: ProductUnit;
  price_czk: number;
  weight_grams: number;
  ean: string | null;
  stock_qty: number | null;
  in_stock: boolean;
  is_published: boolean;
};

export type PosCustomer = { id: string; name: string; email: string | null; phone: string; points: number; card_code: string | null };

export type PosPayment = "hotove" | "karta" | "qr" | "prevod";
export const POS_PAYMENT_LABEL: Record<PosPayment, string> = { hotove: "Hotově", karta: "Kartou", qr: "QR platba", prevod: "Zaplaceno předem" };

export type PosSaleRow = {
  id: string;
  number: string;
  customer_id: string | null;
  order_id: string | null;
  status: "zaplaceno" | "storno";
  subtotal_czk: number;
  discount_czk: number;
  discount_note: string;
  coupon_code: string | null;
  points_redeemed: number;
  points_discount_czk: number;
  points_earned: number;
  total_czk: number;
  payment: PosPayment;
  cash_received_czk: number | null;
  change_czk: number | null;
  note: string;
  created_at: string;
  cancel_reason: string | null;
  cashier: string | null;
};

export type PosSaleItemRow = { id: string; name: string; qty: number; unit: ProductUnit; unit_price_czk: number; line_total_czk: number };

export type ShiftRow = {
  id: string;
  opened_at: string;
  closed_at: string | null;
  opening_cash_czk: number;
  closing_cash_czk: number | null;
  expected_cash_czk: number | null;
  cash_sales_czk: number;
  card_sales_czk: number;
  qr_sales_czk: number;
  sales_count: number;
  cancelled_count: number;
  note: string;
};

export type PickupOrder = {
  id: string;
  order_number: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  payment_method: "karta" | "prevod" | "hotove";
  paid_at: string | null;
  total_czk: number;
  created_at: string;
  order_items: { name: string; qty: number }[];
};

/** Položka účtenky v kase (před zaplacením). */
export type CartLine = { product: PosProduct; qty: number };

export const round5 = (n: number) => Math.round(n / 5) * 5;

/** České číslo účtu (předčíslí-číslo/kód banky) na IBAN. IBAN vrátí beze změny. */
export function czAccountToIban(account: string): string | null {
  const s = account.replace(/\s+/g, "").toUpperCase();
  if (/^CZ\d{22}$/.test(s)) return s;
  const m = s.match(/^(?:(\d{1,6})-)?(\d{2,10})\/(\d{4})$/);
  if (!m) return null;
  const bban = m[3] + (m[1] ?? "").padStart(6, "0") + m[2].padStart(10, "0");
  // kontrolní číslice: mod 97 nad BBAN + "CZ00" převedeným na čísla (C=12, Z=35)
  const numeric = bban + "123500";
  let rem = 0;
  for (const ch of numeric) rem = (rem * 10 + Number(ch)) % 97;
  const check = String(98 - rem).padStart(2, "0");
  return `CZ${check}${bban}`;
}

/** Řetězec pro QR platbu (Short Payment Descriptor, český standard). */
export function spdString(iban: string, amountCzk: number, message: string, vs?: string) {
  const parts = ["SPD*1.0", `ACC:${iban}`, `AM:${amountCzk.toFixed(2)}`, "CC:CZK", `MSG:${message.replace(/[*]/g, " ").slice(0, 60)}`];
  if (vs) parts.push(`X-VS:${vs.replace(/\D/g, "").slice(0, 10)}`);
  return parts.join("*");
}
