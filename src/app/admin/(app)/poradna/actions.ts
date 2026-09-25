"use server";

import { revalidatePath } from "next/cache";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

export async function setInquiryAnswered(fd: FormData) {
  if (!(await getAdmin())) throw new Error("Nepřihlášený uživatel");
  const id = String(fd.get("id") ?? "");
  const answered = fd.get("answered") === "1";
  const db = await getAuthSupabase();
  await db.from("inquiries").update({ answered }).eq("id", id);
  revalidatePath("/admin/poradna");
}
