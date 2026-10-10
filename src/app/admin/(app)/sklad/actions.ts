"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { flashError, flashOk } from "@/lib/flash";
import { getAdmin, getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export type ReceiptState = { ok?: true; number?: string; error?: string } | null;

export type ReceiptLine = { product_id: string; qty: number; unit_cost_czk: number; batch_no: string; expires_on: string };

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
  await logActivity(db, admin, { kind: "prijemka.zauctovana", subject: "receipt", subjectId: r.id, text: `Příjemka ${r.number}${fd.get("supplier") ? ` · ${String(fd.get("supplier")).trim()}` : ""}: ${r.items} položek${admin.isManager ? `, ${Math.round(Number(r.total_czk))} Kč` : ""}` });
  revalidatePath("/admin/sklad");
  revalidatePath("/admin/sklad/prijemky");
  revalidatePath("/admin/produkty");
  revalidatePath("/admin");
  return { ok: true, number: (data as { number: string }).number };
}

/** Odpis (kolik ubylo) nebo inventura (nový skutečný stav) u jednoho produktu. */
export async function adjustStock(fd: FormData) {
  const admin = await requireAdmin();
  const productId = String(fd.get("product_id") ?? "");
  const kind = String(fd.get("kind") ?? "");
  const qty = Number(String(fd.get("qty") ?? "").replace(",", "."));
  const note = String(fd.get("note") ?? "").trim();
  if (!productId || !["odpis", "inventura"].includes(kind) || !Number.isFinite(qty) || qty < 0) return flashError("Zadejte množství.");
  if (kind === "odpis" && qty === 0) return flashError("Odpis musí být větší než nula.");
  const db = await getAuthSupabase();
  const { data: after, error } = await db.rpc("adjust_stock", { p_product_id: productId, p_kind: kind, p_qty: qty, p_note: note });
  if (error) return flashError(`Pohyb se nepodařilo zapsat: ${error.message}`);
  const { data: p } = await db.from("products").select("line, variant, unit").eq("id", productId).maybeSingle();
  const name = p ? `${p.variant.charAt(0).toUpperCase()}${p.variant.slice(1)}` : "Produkt";
  await logActivity(db, admin, { kind: `sklad.${kind}`, subject: "product", subjectId: productId, text: `${name}: ${kind === "odpis" ? `odpis ${qty}` : `inventura, nový stav ${qty}`} ${p?.unit ?? ""}${note ? ` (${note})` : ""}, skladem ${Number(after)} ${p?.unit ?? ""}` });
  await flashOk(kind === "odpis" ? `Odepsáno ${qty} ${p?.unit ?? ""}, skladem ${Number(after)}.` : `Inventura zapsána, skladem ${Number(after)} ${p?.unit ?? ""}.`);
  revalidatePath(`/admin/produkty/${productId}`);
  revalidatePath("/admin/produkty");
  revalidatePath("/admin/sklad");
  revalidatePath(`/admin/sklad/${productId}`);
  revalidatePath("/admin");
  const to = String(fd.get("redirect") ?? "");
  if (to.startsWith("/admin/")) redirect(to);
}
