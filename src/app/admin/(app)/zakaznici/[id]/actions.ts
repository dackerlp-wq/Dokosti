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
