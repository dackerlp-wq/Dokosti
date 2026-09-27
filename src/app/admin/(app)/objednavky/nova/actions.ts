"use server";

import { revalidatePath } from "next/cache";
import { getSettings } from "@/lib/settings";
import { sendNewOrderEmails } from "@/lib/order-emails";
import type { PosCustomer } from "@/lib/pos";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

export type AdminOrderInput = {
  customerId: string | null;
  customer: { name: string; phone: string; email: string; street: string; city: string; zip: string };
  items: { slug: string; qty: number }[];
  shipping: "odber" | "rozvoz" | "prepravce";
  payment: "hotove" | "prevod";
  deliveryDate?: string;
  paid: boolean;
  couponCode: string;
  pointsRedeem: number;
  discountCzk: number;
  discountPct: number;
  discountNote: string;
  note: string;
  notifyCustomer: boolean;
};

export type AdminOrderResult = { ok: true; id: string; orderNumber: string; totalCzk: number } | { ok: false; error: string };

const ERRORS: [string, string][] = [
  ["name required", "Doplňte jméno zákazníka."],
  ["empty order", "Přidejte aspoň jednu položku."],
  ["unavailable", "Některý produkt není v nabídce nebo je vyprodaný."],
  ["out of stock", "Některé zboží není skladem v tomto množství."],
  ["coupon:", "Slevový kód nejde použít."],
  ["discount not allowed", "Ruční slevu může dát jen správce."],
  ["points", "Kostičky nejde uplatnit v tomto množství."],
  ["unknown customer", "Zákazník už neexistuje."],
];

/** Založí objednávku za zákazníka (telefonická). Ceny a slevy počítá databáze (`admin_create_order`). */
export async function createAdminOrder(input: AdminOrderInput): Promise<AdminOrderResult> {
  const admin = await getAdmin();
  if (!admin) return { ok: false, error: "Nepřihlášený uživatel." };
  const c = input.customer;
  if (!c.name.trim()) return { ok: false, error: "Doplňte jméno zákazníka." };
  if (c.email.trim() && !c.email.includes("@")) return { ok: false, error: "E-mail nevypadá správně." };
  if (input.shipping !== "odber" && (!c.street.trim() || !c.city.trim() || !c.zip.trim())) return { ok: false, error: "Pro doručení potřebujeme adresu." };
  if (input.shipping === "prepravce" && input.payment === "hotove" && !input.paid) return { ok: false, error: "U přepravce nejde platit na místě." };
  if (input.shipping === "rozvoz" && !/^\d{4}-\d{2}-\d{2}$/.test(input.deliveryDate ?? "")) return { ok: false, error: "Vyberte den rozvozu." };
  const items = input.items.map((i) => ({ product_slug: i.slug, qty: Number(i.qty) })).filter((i) => i.qty > 0);
  if (!items.length) return { ok: false, error: "Přidejte aspoň jednu položku." };

  const db = await getAuthSupabase();
  const { data, error } = await db.rpc("admin_create_order", {
    p_order: {
      customer_id: input.customerId ?? "",
      customer_name: c.name.trim(),
      customer_email: c.email.trim(),
      customer_phone: c.phone.trim(),
      street: c.street.trim(),
      city: c.city.trim(),
      zip: c.zip.trim(),
      note: input.note.trim(),
      shipping_method: input.shipping,
      payment_method: input.payment,
      delivery_date: input.shipping === "rozvoz" ? input.deliveryDate : "",
      paid: input.paid,
      coupon_code: input.couponCode.trim(),
      points_redeem: Math.max(0, Math.floor(input.pointsRedeem)),
      discount_czk: Math.max(0, Math.round(input.discountCzk)),
      discount_pct: Math.max(0, Math.round(input.discountPct)),
      discount_note: input.discountNote.trim(),
    },
    p_items: items,
  });
  if (error || !data) {
    console.error("admin_create_order", error);
    return { ok: false, error: ERRORS.find(([k]) => error?.message?.includes(k))?.[1] ?? "Objednávku se nepodařilo uložit." };
  }
  const r = data as { id: string; order_number: string; total_czk: number };
  await sendNewOrderEmails(db, r.order_number, await getSettings(), { notifyCustomer: input.notifyCustomer });
  revalidatePath("/admin");
  revalidatePath("/admin/objednavky");
  return { ok: true, id: r.id, orderNumber: r.order_number, totalCzk: r.total_czk };
}

export type AdminCustomer = PosCustomer & { street: string; city: string; zip: string };

/** Zákazníci podle jména, telefonu, e-mailu nebo karty, včetně adresy pro předvyplnění. */
export async function findCustomers(query: string): Promise<AdminCustomer[]> {
  if (!(await getAdmin())) return [];
  const q = query.trim();
  if (q.length < 2) return [];
  const db = await getAuthSupabase();
  const safe = q.replace(/[,%()]/g, " ");
  const { data } = await db
    .from("customers")
    .select("id, name, email, phone, points, card_code, street, city, zip")
    .or(`name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%,card_code.eq.${safe.toUpperCase()}`)
    .order("name")
    .limit(10);
  return (data ?? []) as AdminCustomer[];
}
