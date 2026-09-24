"use server";

import { revalidatePath } from "next/cache";
import { isOrderStatus } from "@/lib/admin";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

export async function setOrderStatus(formData: FormData) {
  if (!(await getAdmin())) throw new Error("Nepřihlášený uživatel");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !isOrderStatus(status)) return;
  const db = await getAuthSupabase();
  const { error } = await db.from("orders").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/admin/objednavky");
  revalidatePath(`/admin/objednavky/${id}`);
}
