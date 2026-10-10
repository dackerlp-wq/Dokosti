"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { normalizeCardCode } from "@/lib/cards";
import { flashError, flashOk } from "@/lib/flash";
import { getAuthSupabase, requireAdmin, requireManager } from "@/lib/supabase/auth";

/** Nová dávka předtištěných karet (jen správce). Po vytvoření otevře dávku. */
export async function generateCards(fd: FormData): Promise<void> {
  const admin = await requireManager();
  const count = Math.min(1000, Math.max(1, Math.round(Number(fd.get("count")) || 100)));
  const db = await getAuthSupabase();
  const { data, error } = await db.rpc("cards_generate", { p_count: count });
  if (error) return flashError(`Dávku se nepodařilo vytvořit: ${error.message}`);
  await logActivity(db, admin, { kind: "karty.davka", subject: "card", subjectId: String(data), text: `Nová dávka karet č. ${data}: ${count} ks` });
  revalidatePath("/admin/karty");
  await flashOk(`Dávka ${data} s ${count} kartami je připravená k tisku.`);
  redirect(`/admin/karty?davka=${data as number}`);
}

/** Blokace ztracené karty nebo odblokování (obsluha i správce), s důvodem do deníku. */
export async function setCardBlocked(fd: FormData): Promise<void> {
  const admin = await requireAdmin();
  const code = normalizeCardCode(String(fd.get("code") ?? ""));
  const blocked = fd.get("blocked") === "1";
  const reason = String(fd.get("reason") ?? "").trim();
  const db = await getAuthSupabase();
  const { error } = await db.rpc("card_set_blocked", { p_code: code, p_blocked: blocked });
  if (error) return flashError(`Nepodařilo se: ${error.message}`);
  await logActivity(db, admin, { kind: blocked ? "karta.blokace" : "karta.odblokovani", subject: "card", subjectId: code, text: `Karta ${code} ${blocked ? "zablokována" : "odblokována"}${reason ? ` (${reason})` : ""}` });
  revalidatePath("/admin/karty");
  await flashOk(blocked ? `Karta ${code} zablokována.` : `Karta ${code} odblokována.`);
  redirect(`/admin/karty?${String(fd.get("back") ?? "")}`);
}
