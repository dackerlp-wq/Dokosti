"use server";

import { revalidatePath } from "next/cache";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

export async function addBatch(fd: FormData) {
  if (!(await getAdmin())) throw new Error("Nepřihlášený uživatel");
  const productId = String(fd.get("product_id") ?? "");
  const expires = String(fd.get("expires_on") ?? "");
  const qty = Math.max(0, Math.round(Number(fd.get("qty"))));
  if (!productId || !expires || !Number.isFinite(qty)) return;
  const db = await getAuthSupabase();
  await db.from("stock_batches").insert({
    product_id: productId,
    batch_no: String(fd.get("batch_no") ?? "").trim(),
    expires_on: expires,
    qty,
    note: String(fd.get("note") ?? "").trim(),
  });
  revalidatePath(`/admin/produkty/${productId}`);
  revalidatePath("/admin");
}

export async function updateBatchQty(fd: FormData) {
  if (!(await getAdmin())) throw new Error("Nepřihlášený uživatel");
  const id = String(fd.get("id") ?? "");
  const productId = String(fd.get("product_id") ?? "");
  const qty = Math.max(0, Math.round(Number(fd.get("qty"))));
  const db = await getAuthSupabase();
  if (fd.get("delete") === "1") await db.from("stock_batches").delete().eq("id", id);
  else await db.from("stock_batches").update({ qty }).eq("id", id);
  revalidatePath(`/admin/produkty/${productId}`);
  revalidatePath("/admin");
}
