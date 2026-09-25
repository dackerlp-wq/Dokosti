"use server";

import { getProduct } from "@/lib/products";
import { getSettings } from "@/lib/settings";
import { nextDeliveryDays, paymentMethods, shippingMethods, shippingPrice, type PaymentId, type ShippingId } from "@/lib/shipping";
import { getSupabase } from "@/lib/supabase/server";

export type CheckoutInput = {
  lines: { slug: string; qty: number }[];
  shipping: ShippingId;
  payment: PaymentId;
  /** Rozvozový den (ISO datum), jen u rozvozu. */
  deliveryDate?: string;
  couponCode?: string;
  pointsRedeem?: number;
  customer: {
    name: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    zip: string;
    note: string;
  };
};

export type CheckoutResult =
  | { ok: true; orderNumber: string; totalCzk: number; pointsEarned: number }
  | { ok: false; error: string };

const DB_ERRORS: [string, string][] = [
  ["out of stock", "Některé zboží už není skladem v požadovaném množství. Upravte prosím košík."],
  ["unavailable", "Některé zboží už není v nabídce. Upravte prosím košík."],
  ["below minimum", "Objednávka nedosahuje minimální částky pro tento způsob dodání."],
  ["coupon:", "Slevový kód nejde použít. Zkontrolujte ho prosím."],
  ["points", "Kostičky nejde uplatnit v tomto množství."],
  ["shipping disabled", "Tento způsob dodání teď nenabízíme."],
];

/**
 * Přijme objednávku. Ceny, dopravu, slevu i Kostičky počítá databázová funkce
 * create_order z vlastních dat, web jen předává, co zákazník vybral.
 * Když Supabase není nastavené, objednávka se jen zaloguje (vývoj).
 */
export async function submitOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const settings = await getSettings();
  const method = shippingMethods(settings).find((s) => s.id === input.shipping);
  const payment = paymentMethods(settings).find((p) => p.id === input.payment);
  if (!method || !payment) return { ok: false, error: "Neplatný způsob dodání nebo platby." };

  const c = input.customer;
  if (!c.name.trim() || !c.email.includes("@") || !c.phone.trim()) {
    return { ok: false, error: "Doplňte prosím jméno, e-mail a telefon." };
  }
  if (method.id !== "odber" && (!c.street.trim() || !c.city.trim() || !c.zip.trim())) {
    return { ok: false, error: "Pro doručení potřebujeme adresu." };
  }
  if (method.id === "prepravce" && payment.id === "hotove") {
    return { ok: false, error: "U přepravce nejde platit na místě." };
  }
  let deliveryDate = "";
  if (method.id === "rozvoz") {
    const options = nextDeliveryDays(settings.shipping.rozvoz.days);
    if (!input.deliveryDate || !options.includes(input.deliveryDate)) {
      return { ok: false, error: "Vyberte den rozvozu." };
    }
    deliveryDate = input.deliveryDate;
  }

  const items = input.lines
    .map((l) => ({ product_slug: l.slug, qty: Math.floor(l.qty) }))
    .filter((l) => l.qty >= 1);
  if (items.length === 0) return { ok: false, error: "Košík je prázdný." };

  const order = {
    customer_name: c.name.trim(),
    customer_email: c.email.trim(),
    customer_phone: c.phone.trim(),
    street: c.street.trim(),
    city: c.city.trim(),
    zip: c.zip.trim(),
    note: c.note.trim(),
    shipping_method: method.id,
    payment_method: payment.id,
    delivery_date: deliveryDate,
    coupon_code: (input.couponCode ?? "").trim(),
    points_redeem: Math.max(0, Math.floor(input.pointsRedeem ?? 0)),
  };

  const db = getSupabase();
  if (!db) {
    // vývoj bez databáze: spočítat aspoň orientačně
    let subtotal = 0;
    for (const i of items) {
      const p = await getProduct(i.product_slug);
      if (p) subtotal += p.priceCzk * i.qty;
    }
    console.info("[objednávka, Supabase není nastavené]", order, items);
    return { ok: true, orderNumber: `DKDEV${Date.now().toString().slice(-4)}`, totalCzk: subtotal + shippingPrice(method, subtotal), pointsEarned: 0 };
  }

  const { data, error } = await db.rpc("create_order", { p_order: order, p_items: items });
  if (error || !data) {
    console.error("create_order", error);
    const known = DB_ERRORS.find(([k]) => error?.message?.includes(k));
    return { ok: false, error: known?.[1] ?? "Objednávku se nepodařilo uložit. Zkuste to znovu nebo zavolejte." };
  }
  const r = data as { order_number: string; total_czk: number; points_earned: number };
  return { ok: true, orderNumber: r.order_number, totalCzk: r.total_czk, pointsEarned: r.points_earned };
}

export type CouponPreview = { ok: true; code: string; discountCzk: number; label: string } | { ok: false; error: string };

/** Náhled slevového kódu v pokladně. Rozhoduje ale až create_order. */
export async function previewCoupon(code: string, subtotalCzk: number): Promise<CouponPreview> {
  const db = getSupabase();
  if (!db) return { ok: false, error: "Slevové kódy fungují až s databází." };
  const { data, error } = await db.rpc("check_coupon", { p_code: code, p_subtotal: Math.round(subtotalCzk) });
  if (error || !data) return { ok: false, error: "Kód se nepodařilo ověřit." };
  const r = data as { error?: string; code?: string; discount?: number; label?: string };
  if (r.error) return { ok: false, error: r.error };
  return { ok: true, code: r.code!, discountCzk: r.discount!, label: r.label! };
}

/** Kolik Kostiček má zákazník s tímto e-mailem. */
export async function loyaltyBalance(email: string): Promise<number> {
  const db = getSupabase();
  if (!db || !email.includes("@")) return 0;
  const { data } = await db.rpc("loyalty_balance", { p_email: email });
  return typeof data === "number" ? data : 0;
}
