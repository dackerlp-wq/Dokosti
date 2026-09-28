"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeCardCode } from "@/lib/cards";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

/** Nová dávka předtištěných karet (jen správce). Po vytvoření otevře tiskovou stránku dávky. */
export async function generateCards(fd: FormData): Promise<void> {
  const admin = await getAdmin();
  if (!admin?.isManager) redirect("/admin/karty?chyba=opravneni");
  const count = Math.min(1000, Math.max(1, Math.round(Number(fd.get("count")) || 100)));
  const db = await getAuthSupabase();
  const { data, error } = await db.rpc("cards_generate", { p_count: count });
  if (error) {
    console.error("cards_generate", error.message);
    redirect("/admin/karty?chyba=generovani");
  }
  revalidatePath("/admin/karty");
  redirect(`/admin/karty?davka=${data as number}`);
}

/** Blokace ztracené karty nebo odblokování (obsluha i správce). */
export async function setCardBlocked(fd: FormData): Promise<void> {
  if (!(await getAdmin())) redirect("/admin/login");
  const code = normalizeCardCode(String(fd.get("code") ?? ""));
  const blocked = fd.get("blocked") === "1";
  const db = await getAuthSupabase();
  await db.rpc("card_set_blocked", { p_code: code, p_blocked: blocked });
  revalidatePath("/admin/karty");
  redirect(`/admin/karty?${String(fd.get("back") ?? "")}`);
}
