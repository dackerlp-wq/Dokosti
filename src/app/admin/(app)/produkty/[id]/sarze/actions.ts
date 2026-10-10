"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { flashError, flashOk } from "@/lib/flash";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

function revalidate(productId: string) {
  revalidatePath(`/admin/produkty/${productId}`);
  revalidatePath(`/admin/sklad/${productId}`);
  revalidatePath("/admin");
}

export async function addBatch(fd: FormData) {
  const admin = await requireAdmin();
  const productId = String(fd.get("product_id") ?? "");
  const expires = String(fd.get("expires_on") ?? "");
  const qty = Number(String(fd.get("qty") ?? "").replace(",", "."));
  if (!productId || !expires || !Number.isFinite(qty) || qty < 0) return flashError("Vyplňte expiraci a množství.");
  const db = await getAuthSupabase();
  const batchNo = String(fd.get("batch_no") ?? "").trim();
  const { error } = await db.from("stock_batches").insert({ product_id: productId, batch_no: batchNo, expires_on: expires, qty, note: String(fd.get("note") ?? "").trim() });
  if (error) return flashError(`Šarži se nepodařilo uložit: ${error.message}`);
  await logActivity(db, admin, { kind: "sarze.pridana", subject: "product", subjectId: productId, text: `Šarže ${batchNo || "bez čísla"} do ${expires}: ${qty}` });
  revalidate(productId);
  await flashOk("Šarže přidána. Stav skladu se tím nemění, ten řídí příjemka.");
}

export async function updateBatchQty(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const productId = String(fd.get("product_id") ?? "");
  const qty = Number(String(fd.get("qty") ?? "").replace(",", "."));
  const db = await getAuthSupabase();
  const { data: b } = await db.from("stock_batches").select("batch_no").eq("id", id).maybeSingle();
  if (fd.get("delete") === "1") {
    const { error } = await db.from("stock_batches").delete().eq("id", id);
    if (error) return flashError(error.message);
    await logActivity(db, admin, { kind: "sarze.smazana", subject: "product", subjectId: productId, text: `Šarže ${b?.batch_no || "bez čísla"} smazána` });
    revalidate(productId);
    return flashOk("Šarže smazána.");
  }
  if (!Number.isFinite(qty) || qty < 0) return flashError("Množství musí být číslo.");
  const { error } = await db.from("stock_batches").update({ qty }).eq("id", id);
  if (error) return flashError(error.message);
  await logActivity(db, admin, { kind: "sarze.mnozstvi", subject: "product", subjectId: productId, text: `Šarže ${b?.batch_no || "bez čísla"}: množství ${qty}` });
  revalidate(productId);
  await flashOk("Šarže uložena.");
}
