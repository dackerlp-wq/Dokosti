"use server";

import { revalidatePath } from "next/cache";
import type { PickupOrder, PosCustomer, PosPayment, PosSaleItemRow, PosSaleRow, ShiftRow } from "@/lib/pos";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

const ERRORS: [string, string][] = [
  ["no shift", "Nejdřív otevřete směnu (záložka Uzávěrka)."],
  ["empty sale", "Účtenka je prázdná."],
  ["coupon:", "Slevový kód nejde použít."],
  ["discount not allowed", "Ruční slevu může dát jen správce."],
  ["points", "Kostičky nejde uplatnit v tomto množství."],
  ["cash short", "Přijatá hotovost je nižší než cena."],
  ["card taken", "Tato karta už je přiřazená jinému zákazníkovi."],
  ["order closed", "Objednávka je už vyřízená nebo zrušená."],
  ["storno not allowed", "Obsluha může stornovat jen vlastní účtenku do 10 minut. Zavolejte správce."],
  ["unknown product", "Některý produkt už neexistuje."],
];
const explain = (msg: string | undefined, fallback: string) => ERRORS.find(([k]) => msg?.includes(k))?.[1] ?? fallback;

async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) throw new Error("Nepřihlášený uživatel");
  return admin;
}

export type CheckoutInput = {
  customerId: string | null;
  payment: PosPayment;
  cashReceivedCzk?: number;
  discountCzk?: number;
  discountPct?: number;
  discountNote?: string;
  couponCode?: string;
  pointsRedeem?: number;
  note?: string;
  items: { productId: string; qty: number }[];
};

export type CheckoutResult = Ok<{ id: string; number: string; totalCzk: number; changeCzk: number | null; pointsEarned: number }> | Err;

export async function posCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  await requireAdmin();
  const db = await getAuthSupabase();
  const { data, error } = await db.rpc("pos_checkout", {
    p_sale: {
      customer_id: input.customerId ?? "",
      payment: input.payment,
      cash_received_czk: input.cashReceivedCzk ?? null,
      discount_czk: Math.max(0, Math.round(input.discountCzk ?? 0)),
      discount_pct: Math.max(0, Number(input.discountPct ?? 0)),
      discount_note: input.discountNote ?? "",
      coupon_code: input.couponCode ?? "",
      points_redeem: Math.max(0, Math.round(input.pointsRedeem ?? 0)),
      note: input.note ?? "",
    },
    p_items: input.items.map((i) => ({ product_id: i.productId, qty: i.qty })),
  });
  if (error || !data) return { ok: false, error: explain(error?.message, "Prodej se nepodařilo uložit.") };
  const r = data as { id: string; number: string; total_czk: number; change_czk: number | null; points_earned: number };
  revalidatePath("/admin");
  return { ok: true, id: r.id, number: r.number, totalCzk: r.total_czk, changeCzk: r.change_czk, pointsEarned: r.points_earned };
}

export async function posSettleOrder(orderId: string, payment: PosPayment, cashReceivedCzk?: number): Promise<Ok<{ id: string; number: string; changeCzk: number | null }> | Err> {
  await requireAdmin();
  const db = await getAuthSupabase();
  const { data, error } = await db.rpc("pos_settle_order", { p_order_id: orderId, p_payment: payment, p_cash_received: cashReceivedCzk ?? null });
  if (error || !data) return { ok: false, error: explain(error?.message, "Výdej se nepodařilo zapsat.") };
  const r = data as { id: string; number: string; change_czk: number | null };
  revalidatePath("/admin");
  revalidatePath("/admin/objednavky");
  return { ok: true, id: r.id, number: r.number, changeCzk: r.change_czk };
}

export async function posCancelSale(saleId: string, reason: string): Promise<Ok<object> | Err> {
  await requireAdmin();
  const db = await getAuthSupabase();
  const { error } = await db.rpc("pos_cancel_sale", { p_sale_id: saleId, p_reason: reason });
  if (error) return { ok: false, error: explain(error.message, "Storno se nepodařilo.") };
  return { ok: true };
}

export async function posOpenShift(openingCash: number): Promise<Ok<{ id: string }> | Err> {
  await requireAdmin();
  const db = await getAuthSupabase();
  const { data, error } = await db.rpc("pos_open_shift", { p_opening_cash: Math.max(0, Math.round(openingCash)) });
  if (error || !data) return { ok: false, error: "Směnu se nepodařilo otevřít." };
  return { ok: true, id: data as string };
}

export type CloseResult = { cash: number; card: number; qr: number; count: number; cancelled: number; expected: number; counted: number; difference: number };
export async function posCloseShift(countedCash: number, note: string): Promise<Ok<CloseResult> | Err> {
  await requireAdmin();
  const db = await getAuthSupabase();
  const { data, error } = await db.rpc("pos_close_shift", { p_closing_cash: Math.round(countedCash), p_note: note });
  if (error || !data) return { ok: false, error: explain(error?.message, "Uzávěrku se nepodařilo uložit.") };
  return { ok: true, ...(data as CloseResult) };
}

export async function posCashMove(kind: "vklad" | "vyber", amount: number, note: string): Promise<Ok<object> | Err> {
  await requireAdmin();
  const db = await getAuthSupabase();
  const { error } = await db.rpc("pos_cash_move", { p_kind: kind, p_amount: Math.round(amount), p_note: note });
  if (error) return { ok: false, error: explain(error.message, "Pohyb hotovosti se nepodařilo zapsat.") };
  return { ok: true };
}

/** Přehled otevřené směny: prodeje a pohyby hotovosti. */
export async function posShiftSummary(): Promise<{ shift: ShiftRow | null; cash: number; card: number; qr: number; count: number; cancelled: number; moves: { id: string; kind: "vklad" | "vyber"; amount_czk: number; note: string; created_at: string }[]; expected: number }> {
  await requireAdmin();
  const db = await getAuthSupabase();
  const { data: shift } = await db.from("pos_shifts").select("*").is("closed_at", null).order("opened_at", { ascending: false }).limit(1).maybeSingle();
  if (!shift) return { shift: null, cash: 0, card: 0, qr: 0, count: 0, cancelled: 0, moves: [], expected: 0 };
  const s = shift as ShiftRow;
  const [{ data: sales }, { data: moves }] = await Promise.all([
    db.from("pos_sales").select("total_czk, payment, status").eq("shift_id", s.id),
    db.from("pos_cash_moves").select("id, kind, amount_czk, note, created_at").eq("shift_id", s.id).order("created_at"),
  ]);
  const paid = ((sales ?? []) as { total_czk: number; payment: PosPayment; status: string }[]).filter((x) => x.status === "zaplaceno");
  const sum = (p: PosPayment) => paid.filter((x) => x.payment === p).reduce((n, x) => n + x.total_czk, 0);
  const mv = (moves ?? []) as { id: string; kind: "vklad" | "vyber"; amount_czk: number; note: string; created_at: string }[];
  const cash = sum("hotove");
  const expected = s.opening_cash_czk + cash + mv.filter((m) => m.kind === "vklad").reduce((n, m) => n + m.amount_czk, 0) - mv.filter((m) => m.kind === "vyber").reduce((n, m) => n + m.amount_czk, 0);
  return { shift: s, cash, card: sum("karta"), qr: sum("qr"), count: paid.length, cancelled: (sales ?? []).length - paid.length, moves: mv, expected };
}

export async function posRecentSales(limit = 40): Promise<(PosSaleRow & { customers: { name: string } | null })[]> {
  await requireAdmin();
  const db = await getAuthSupabase();
  const { data } = await db.from("pos_sales").select("*, customers(name)").order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as (PosSaleRow & { customers: { name: string } | null })[];
}

export async function posSaleItems(saleId: string): Promise<PosSaleItemRow[]> {
  await requireAdmin();
  const db = await getAuthSupabase();
  const { data } = await db.from("pos_sale_items").select("id, name, qty, unit, unit_price_czk, line_total_czk").eq("sale_id", saleId);
  return (data ?? []) as PosSaleItemRow[];
}

export async function posPickupOrders(): Promise<PickupOrder[]> {
  await requireAdmin();
  const db = await getAuthSupabase();
  const { data } = await db
    .from("orders")
    .select("id, order_number, status, customer_name, customer_phone, payment_method, paid_at, total_czk, created_at, order_items(name, qty)")
    .eq("shipping_method", "odber")
    .in("status", ["nova", "potvrzena", "pripravena"])
    .order("created_at");
  return (data ?? []) as PickupOrder[];
}

/** Zákazníci podle jména, telefonu, e-mailu nebo kódu karty. */
export async function posFindCustomers(query: string): Promise<PosCustomer[]> {
  await requireAdmin();
  const q = query.trim();
  if (q.length < 2) return [];
  const db = await getAuthSupabase();
  const safe = q.replace(/[,%()]/g, " ");
  const { data } = await db
    .from("customers")
    .select("id, name, email, phone, points, card_code")
    .or(`name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%,card_code.eq.${safe.toUpperCase()}`)
    .order("name")
    .limit(12);
  return (data ?? []) as PosCustomer[];
}

export async function posCustomerByCard(code: string): Promise<PosCustomer | null> {
  await requireAdmin();
  const db = await getAuthSupabase();
  const { data } = await db.from("customers").select("id, name, email, phone, points, card_code").eq("card_code", code.trim().toUpperCase()).maybeSingle();
  return (data as PosCustomer | null) ?? null;
}

export async function posAssignCard(code: string, customerId: string | null, name?: string, phone?: string, email?: string): Promise<Ok<{ customer: PosCustomer }> | Err> {
  await requireAdmin();
  const db = await getAuthSupabase();
  const { data, error } = await db.rpc("pos_assign_card", { p_code: code, p_customer_id: customerId, p_name: name ?? null, p_phone: phone ?? null, p_email: email ?? null });
  if (error || !data) return { ok: false, error: explain(error?.message, error?.message.includes("name") ? "Zadejte jméno zákazníka." : "Kartu se nepodařilo přiřadit.") };
  const { data: c } = await db.from("customers").select("id, name, email, phone, points, card_code").eq("id", data as string).single();
  revalidatePath("/admin/zakaznici");
  return { ok: true, customer: c as PosCustomer };
}

/** Nový zákazník založený u pultu (bez karty). */
export async function posCreateCustomer(name: string, phone: string, email: string): Promise<Ok<{ customer: PosCustomer }> | Err> {
  await requireAdmin();
  if (!name.trim()) return { ok: false, error: "Zadejte jméno." };
  const db = await getAuthSupabase();
  const mail = email.trim().toLowerCase() || null;
  if (mail) {
    const { data: existing } = await db.from("customers").select("id, name, email, phone, points, card_code").eq("email", mail).maybeSingle();
    if (existing) return { ok: true, customer: existing as PosCustomer };
  }
  const { data, error } = await db.from("customers").insert({ name: name.trim(), phone: phone.trim(), email: mail }).select("id, name, email, phone, points, card_code").single();
  if (error || !data) return { ok: false, error: "Zákazníka se nepodařilo založit." };
  revalidatePath("/admin/zakaznici");
  return { ok: true, customer: data as PosCustomer };
}
