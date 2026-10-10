"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { flashError, flashOk } from "@/lib/flash";
import { getAdmin, getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";
import { closeAutoTask, ensureAutoTask } from "@/lib/tasks";

export type ReceiptState = { ok?: true; number?: string; error?: string; taskCreated?: boolean; orderClosed?: boolean } | null;

export type ReceiptLine = { product_id: string; qty: number; unit_cost_czk: number; batch_no: string; expires_on: string; ordered_qty?: number | null };

/** Zaúčtuje příjemku od dodavatele (RPC post_receipt: položky, pohyby, šarže, nákupní cena). */
export async function postReceipt(_prev: ReceiptState, fd: FormData): Promise<ReceiptState> {
  if (!(await getAdmin())) return { error: "Nejste přihlášeni." };
  let lines: ReceiptLine[];
  try {
    lines = JSON.parse(String(fd.get("lines") ?? "[]")) as ReceiptLine[];
  } catch {
    return { error: "Položky se nepodařilo přečíst." };
  }
  const items = lines
    .map((l) => ({ product_id: String(l.product_id ?? ""), qty: Number(l.qty), unit_cost_czk: Math.max(0, Number(l.unit_cost_czk) || 0), batch_no: String(l.batch_no ?? "").trim(), expires_on: String(l.expires_on ?? "").trim() }))
    .filter((l) => l.product_id && l.qty > 0);
  if (items.length === 0) return { error: "Přidejte aspoň jednu položku s množstvím." };
  const db = await getAuthSupabase();
  const { data, error } = await db.rpc("post_receipt", {
    p_receipt: { supplier: String(fd.get("supplier") ?? "").trim(), doc_no: String(fd.get("doc_no") ?? "").trim(), note: String(fd.get("note") ?? "").trim() },
    p_items: items,
  });
  if (error || !data) return { error: error?.message ?? "Příjemku se nepodařilo uložit." };
  const r = data as { id: string; number: string; total_czk: number; items: number };
  const admin = (await getAdmin())!;
  // Vazby: objednávka u dodavatele, splatnost a částka faktury, objednané množství u položek.
  const orderId = String(fd.get("purchase_order_id") ?? "");
  const dueOn = String(fd.get("due_on") ?? "").trim() || null;
  const invoiceTotal = admin.isManager && String(fd.get("invoice_total_czk") ?? "").trim() ? Number(fd.get("invoice_total_czk")) : null;
  await db.from("stock_receipts").update({ purchase_order_id: orderId || null, due_on: dueOn, invoice_total_czk: invoiceTotal }).eq("id", r.id);
  for (const l of lines) if (l.ordered_qty !== null && l.ordered_qty !== undefined) await db.from("stock_receipt_items").update({ ordered_qty: Number(l.ordered_qty) }).eq("receipt_id", r.id).eq("product_id", String(l.product_id));
  let orderClosed = false;
  if (orderId) {
    const { error: e } = await db.from("purchase_orders").update({ status: "prijata", received_at: new Date().toISOString(), receipt_id: r.id }).eq("id", orderId);
    for (const it of items) await db.from("purchase_order_items").update({ received_qty: it.qty }).eq("purchase_order_id", orderId).eq("product_id", it.product_id);
    orderClosed = !e;
  }
  let taskCreated = false;
  if (dueOn) {
    await ensureAutoTask(db, { autoKey: `invoice-due:${r.id}`, title: `Zaplatit fakturu ${String(fd.get("doc_no") ?? "").trim() || r.number}${fd.get("supplier") ? ` · ${String(fd.get("supplier")).trim()}` : ""}`, detail: invoiceTotal ? `${Math.round(invoiceTotal)} Kč` : "", href: `/admin/sklad/prijemky#${r.id}`, dueOn, sourceType: "receipt", sourceId: r.id });
    taskCreated = true;
  }
  await logActivity(db, admin, { kind: "prijemka.zauctovana", subject: "receipt", subjectId: r.id, text: `Příjemka ${r.number}${fd.get("supplier") ? ` · ${String(fd.get("supplier")).trim()}` : ""}: ${r.items} položek${admin.isManager ? `, ${Math.round(Number(r.total_czk))} Kč` : ""}${orderClosed ? ", objednávka u dodavatele přijata" : ""}` });
  revalidatePath("/admin/nakup");
  revalidatePath("/admin/ukoly");
  revalidatePath("/admin/sklad");
  revalidatePath("/admin/sklad/prijemky");
  revalidatePath("/admin/produkty");
  revalidatePath("/admin");
  return { ok: true, number: r.number, taskCreated, orderClosed };
}

/** Faktura k příjemce je zaplacená: zavře úkol a zapíše datum (pro finance). */
export async function markReceiptPaid(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const db = await getAuthSupabase();
  const { data: r } = await db.from("stock_receipts").select("number, doc_no, supplier").eq("id", id).maybeSingle();
  if (!r) return flashError("Příjemka nenalezena.");
  const { error } = await db.from("stock_receipts").update({ paid_at: new Date().toISOString() }).eq("id", id);
  if (error) return flashError(error.message);
  await closeAutoTask(db, `invoice-due:${id}`);
  await logActivity(db, admin, { kind: "prijemka.zaplacena", subject: "receipt", subjectId: id, text: `Faktura ${r.doc_no || r.number}${r.supplier ? ` · ${r.supplier}` : ""} zaplacena` });
  revalidatePath("/admin/sklad/prijemky");
  revalidatePath("/admin/ukoly");
  revalidatePath("/admin");
  await flashOk("Označeno jako zaplacené.");
}

/** Odpis (kolik ubylo) nebo inventura (nový skutečný stav) u jednoho produktu. */
export async function adjustStock(fd: FormData) {
  const admin = await requireAdmin();
  const productId = String(fd.get("product_id") ?? "");
  const kind = String(fd.get("kind") ?? "");
  const qty = Number(String(fd.get("qty") ?? "").replace(",", "."));
  const note = String(fd.get("note") ?? "").trim();
  if (!productId || !["odpis", "inventura", "interni"].includes(kind) || !Number.isFinite(qty) || qty < 0) return flashError("Zadejte množství.");
  if (kind !== "inventura" && qty === 0) return flashError("Množství musí být větší než nula.");
  const db = await getAuthSupabase();
  const { data: after, error } = await db.rpc("adjust_stock", { p_product_id: productId, p_kind: kind, p_qty: qty, p_note: note });
  if (error) return flashError(`Pohyb se nepodařilo zapsat: ${error.message}`);
  const { data: p } = await db.from("products").select("line, variant, unit").eq("id", productId).maybeSingle();
  const name = p ? `${p.variant.charAt(0).toUpperCase()}${p.variant.slice(1)}` : "Produkt";
  const what = kind === "odpis" ? `odpis ${qty}` : kind === "interni" ? `interní výdej ${qty}` : `inventura, nový stav ${qty}`;
  await logActivity(db, admin, { kind: `sklad.${kind}`, subject: "product", subjectId: productId, text: `${name}: ${what} ${p?.unit ?? ""}${note ? ` (${note})` : ""}, skladem ${Number(after)} ${p?.unit ?? ""}` });
  await flashOk(kind === "inventura" ? `Inventura zapsána, skladem ${Number(after)} ${p?.unit ?? ""}.` : `${kind === "odpis" ? "Odepsáno" : "Vydáno"} ${qty} ${p?.unit ?? ""}, skladem ${Number(after)}.`);

  revalidatePath(`/admin/produkty/${productId}`);
  revalidatePath("/admin/produkty");
  revalidatePath("/admin/sklad");
  revalidatePath(`/admin/sklad/${productId}`);
  revalidatePath("/admin");
  const to = String(fd.get("redirect") ?? "");
  if (to.startsWith("/admin/")) redirect(to);
}

/** Inventura celého skladu najednou (RPC apply_inventory zapíše jen rozdíly). */
export async function applyInventory(fd: FormData) {
  const admin = await requireAdmin();
  let items: { product_id: string; qty: number }[] = [];
  try {
    items = JSON.parse(String(fd.get("items") ?? "[]")) as { product_id: string; qty: number }[];
  } catch {
    return flashError("Položky se nepodařilo přečíst.");
  }
  const note = String(fd.get("note") ?? "").trim() || `Inventura ${new Date().toLocaleDateString("cs-CZ")}`;
  const db = await getAuthSupabase();
  const { data, error } = await db.rpc("apply_inventory", { p_items: items, p_note: note });
  if (error) return flashError(`Inventuru se nepodařilo zapsat: ${error.message}`);
  const r = data as { changed: number; value_czk: number };
  await logActivity(db, admin, { kind: "sklad.inventura", subject: "product", subjectId: "", text: `${note}: ${items.length} položek spočítáno, ${r.changed} rozdílů v hodnotě ${r.value_czk} Kč` });
  revalidatePath("/admin/sklad");
  revalidatePath("/admin/produkty");
  revalidatePath("/admin");
  await flashOk(r.changed === 0 ? "Inventura zapsána, všechno sedělo." : `Inventura zapsána: ${r.changed} rozdílů, celkem ${r.value_czk} Kč.`);
  redirect("/admin/sklad");
}
