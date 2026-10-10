"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { formatQty, type PurchaseOrderItemRow, type PurchaseOrderRow, type SupplierRow } from "@/lib/admin";
import { productName } from "@/lib/catalog";
import { sendEmail } from "@/lib/email/send";
import { purchaseOrderEmail } from "@/lib/email/templates";
import { flashError, flashOk } from "@/lib/flash";
import { getSettings } from "@/lib/settings";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export type PurchaseLine = { product_id: string; qty: number; unit_cost_czk: number };

function revalidateAll(id?: string) {
  revalidatePath("/admin/nakup");
  if (id) revalidatePath(`/admin/nakup/${id}`);
  revalidatePath("/admin/dodavatele");
  revalidatePath("/admin");
}

/** Založí objednávku u dodavatele jako návrh (položky z JSON v poli `lines`). */
export async function createPurchaseOrder(fd: FormData) {
  const admin = await requireAdmin();
  const supplierId = String(fd.get("supplier_id") ?? "");
  let lines: PurchaseLine[] = [];
  try {
    lines = JSON.parse(String(fd.get("lines") ?? "[]")) as PurchaseLine[];
  } catch {
    return flashError("Položky se nepodařilo přečíst.");
  }
  const items = lines.map((l) => ({ product_id: String(l.product_id ?? ""), qty: Number(l.qty), unit_cost_czk: Math.max(0, Number(l.unit_cost_czk) || 0) })).filter((l) => l.product_id && l.qty > 0);
  if (!supplierId) return flashError("Vyberte dodavatele.");
  if (items.length === 0) return flashError("Přidejte aspoň jednu položku s množstvím.");
  const db = await getAuthSupabase();
  const { data: po, error } = await db
    .from("purchase_orders")
    .insert({ supplier_id: supplierId, note: String(fd.get("note") ?? "").trim().slice(0, 1000), expected_on: String(fd.get("expected_on") ?? "") || null, created_by: admin.id })
    .select("id, number")
    .single();
  if (error || !po) return flashError(`Objednávku se nepodařilo založit: ${error?.message}`);
  const { error: e2 } = await db.from("purchase_order_items").insert(items.map((i) => ({ ...i, purchase_order_id: po.id })));
  if (e2) return flashError(`Položky se nepodařilo uložit: ${e2.message}`);
  const { data: s } = await db.from("suppliers").select("name").eq("id", supplierId).maybeSingle();
  await logActivity(db, admin, { kind: "nakup.zalozena", subject: "product", subjectId: "", text: `Objednávka u dodavatele ${po.number} (${s?.name ?? ""}): ${items.length} položek` });
  revalidateAll(po.id);
  await flashOk(`Objednávka ${po.number} je připravená jako návrh. Odešlete ji dodavateli.`);
  redirect(`/admin/nakup/${po.id}`);
}

/** Odešle objednávku dodavateli e-mailem (když má e-mail) a označí ji jako odeslanou. */
export async function sendPurchaseOrder(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const db = await getAuthSupabase();
  const [{ data: po }, { data: items }, settings] = await Promise.all([db.from("purchase_orders").select("*, suppliers(*)").eq("id", id).maybeSingle(), db.from("purchase_order_items").select("*, products(line, variant, unit, ean)").eq("purchase_order_id", id), getSettings()]);
  if (!po) return flashError("Objednávka nenalezena.");
  const o = po as PurchaseOrderRow & { suppliers: SupplierRow };
  if (o.status !== "navrh") return flashError("Objednávka už byla odeslána.");
  const rows = (items ?? []) as (PurchaseOrderItemRow & { products: { line: "barf"; variant: string; unit: "ks" | "kg"; ean: string | null } })[];
  const lines = rows.map((r) => ({ name: productName(r.products), qty: formatQty(r.qty, r.products.unit), ean: r.products.ean ?? "" }));
  let mailed = false;
  if (o.suppliers.email && fd.get("email") !== "off") {
    await sendEmail(db, o.suppliers.email, purchaseOrderEmail(o.number, lines, o.expected_on, o.note, settings), "objednavka-dodavatel", null);
    mailed = true;
  }
  const { error } = await db.from("purchase_orders").update({ status: "odeslana", sent_at: new Date().toISOString() }).eq("id", id);
  if (error) return flashError(error.message);
  await logActivity(db, admin, { kind: "nakup.odeslana", subject: "product", subjectId: "", text: `Objednávka ${o.number} u ${o.suppliers.name} odeslána${mailed ? ` na ${o.suppliers.email}` : " (bez e-mailu, předána jinak)"}` });
  revalidateAll(id);
  await flashOk(mailed ? `Objednávka odeslána na ${o.suppliers.email}.` : "Objednávka označena jako odeslaná.");
}

export async function cancelPurchaseOrder(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const reason = String(fd.get("reason") ?? "").trim();
  const db = await getAuthSupabase();
  const { data: po } = await db.from("purchase_orders").select("number, status").eq("id", id).maybeSingle();
  if (!po) return flashError("Objednávka nenalezena.");
  if (po.status === "prijata") return flashError("Přijatou objednávku nejde zrušit, má příjemku.");
  const { error } = await db.from("purchase_orders").update({ status: "zrusena", note: reason ? `${reason}` : undefined }).eq("id", id);
  if (error) return flashError(error.message);
  await logActivity(db, admin, { kind: "nakup.zrusena", subject: "product", subjectId: "", text: `Objednávka ${po.number} zrušena${reason ? ` (${reason})` : ""}` });
  revalidateAll(id);
  await flashOk("Objednávka zrušena.");
}
