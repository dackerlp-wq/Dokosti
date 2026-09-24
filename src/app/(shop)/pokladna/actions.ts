"use server";

import { productName } from "@/lib/catalog";
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
  | { ok: true; orderNumber: string }
  | { ok: false; error: string };

/**
 * Přijme objednávku. Ceny se přepočítají na serveru z katalogu, ne z košíku.
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

  const items = [];
  for (const line of input.lines) {
    const product = await getProduct(line.slug);
    const qty = Math.floor(line.qty);
    if (!product || !product.inStock || qty < 1) continue;
    items.push({
      product_slug: product.slug,
      name: productName(product),
      qty,
      unit_price_czk: product.priceCzk,
    });
  }
  if (items.length === 0) return { ok: false, error: "Košík je prázdný." };

  const subtotal = items.reduce((n, i) => n + i.qty * i.unit_price_czk, 0);
  if (subtotal < method.minOrderCzk) {
    return { ok: false, error: `Pro tento způsob dodání je minimální objednávka ${method.minOrderCzk} Kč.` };
  }
  const shipping = shippingPrice(method, subtotal);
  const total = subtotal + shipping;
  const orderNumber = `DK${Date.now().toString().slice(-8)}`;

  const order = {
    order_number: orderNumber,
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
    subtotal_czk: subtotal,
    shipping_czk: shipping,
    total_czk: total,
  };

  const db = getSupabase();
  if (!db) {
    console.info("[objednávka, Supabase není nastavené]", order, items);
    return { ok: true, orderNumber };
  }

  const { data, error } = await db.rpc("create_order", { p_order: order, p_items: items });
  if (error || typeof data !== "string") {
    console.error("create_order", error);
    if (error?.message?.includes("out of stock")) {
      return { ok: false, error: "Některé zboží už není skladem v požadovaném množství. Upravte prosím košík." };
    }
    return { ok: false, error: "Objednávku se nepodařilo uložit. Zkuste to znovu nebo zavolejte." };
  }
  return { ok: true, orderNumber: data };
}
