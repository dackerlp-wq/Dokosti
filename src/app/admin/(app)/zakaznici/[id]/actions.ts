"use server";

import { revalidatePath } from "next/cache";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

export async function saveCustomerNote(formData: FormData) {
  if (!(await getAdmin())) throw new Error("Nepřihlášený uživatel");
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const db = await getAuthSupabase();
  await db.from("customers").update({ note }).eq("id", id);
  revalidatePath(`/admin/zakaznici/${id}`);
}

/** Ruční připsání nebo odepsání Kostiček (např. za nákup v prodejně). */
export async function adjustPoints(formData: FormData) {
  if (!(await getAdmin())) throw new Error("Nepřihlášený uživatel");
  const id = String(formData.get("id") ?? "");
  const points = Math.round(Number(formData.get("points")));
  const reason = String(formData.get("reason") ?? "").trim() || "Ruční úprava";
  if (!id || !Number.isFinite(points) || points === 0) return;
  const db = await getAuthSupabase();
  const { data } = await db.from("customers").select("points").eq("id", id).maybeSingle();
  const next = Math.max(0, (data?.points ?? 0) + points);
  await db.from("customers").update({ points: next }).eq("id", id);
  await db.from("loyalty_transactions").insert({ customer_id: id, points: next - (data?.points ?? 0), reason });
  revalidatePath(`/admin/zakaznici/${id}`);
}
