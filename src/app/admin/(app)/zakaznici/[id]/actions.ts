"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { flashError, flashOk } from "@/lib/flash";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export async function saveCustomerNote(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const db = await getAuthSupabase();
  const { error } = await db.from("customers").update({ note }).eq("id", id);
  if (error) return flashError(`Poznámku se nepodařilo uložit: ${error.message}`);
  await logActivity(db, admin, { kind: "zakaznik.poznamka", subject: "customer", subjectId: id, text: "Poznámka u zákazníka upravena" });
  revalidatePath(`/admin/zakaznici/${id}`);
  await flashOk("Poznámka uložena.");
}

/** Ruční připsání nebo odepsání Kostiček (např. za nákup v prodejně). Odečet jen správce. */
export async function adjustPoints(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const points = Math.round(Number(formData.get("points")));
  const reason = String(formData.get("reason") ?? "").trim() || "Ruční úprava";
  if (!id || !Number.isFinite(points) || points === 0) return flashError("Zadejte počet Kostiček.");
  if (points < 0 && !admin.isManager) return flashError("Kostičky může odečíst jen správce.");
  const db = await getAuthSupabase();
  const { data } = await db.from("customers").select("points, name").eq("id", id).maybeSingle();
  if (!data) return flashError("Zákazník nenalezen.");
  const next = Math.max(0, (data.points ?? 0) + points);
  const delta = next - (data.points ?? 0);
  if (delta === 0) return flashError("Zákazník nemá tolik Kostiček k odečtení.");
  const { error } = await db.from("customers").update({ points: next }).eq("id", id);
  if (error) return flashError(error.message);
  await db.from("loyalty_transactions").insert({ customer_id: id, points: delta, reason: `${reason} (${admin.name})` });
  await logActivity(db, admin, { kind: "zakaznik.kosticky", subject: "customer", subjectId: id, text: `${data.name}: ${delta > 0 ? "+" : ""}${delta} Kostiček (${reason})`, data: { delta, reason } });
  revalidatePath(`/admin/zakaznici/${id}`);
  await flashOk(`${delta > 0 ? "Připsáno" : "Odepsáno"} ${Math.abs(delta)} Kostiček, zůstatek ${next}.`);
}

/** Kód zákaznické karty (čárový kód Code 128). Prázdný kód kartu odebere. */
export async function saveCardCode(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const code = String(formData.get("card_code") ?? "").trim().toUpperCase();
  if (!id) return;
  if (code && (code.length < 4 || /[^\x20-\x7e]/.test(code))) return flashError("Kód karty musí mít aspoň 4 znaky bez diakritiky.");
  const db = await getAuthSupabase();
  const { error } = await db.from("customers").update({ card_code: code || null }).eq("id", id);
  if (error) return flashError(error.message.includes("duplicate") || error.code === "23505" ? "Tento kód už má jiný zákazník." : error.message);
  await logActivity(db, admin, { kind: "zakaznik.karta", subject: "customer", subjectId: id, text: code ? `Karta ${code} přiřazena` : "Karta odebrána" });
  revalidatePath(`/admin/zakaznici/${id}`);
  await flashOk(code ? `Karta ${code} uložena.` : "Karta odebrána.");
}

/** GDPR: osobní údaje zákazníka se nevratně přepíší (zákazník, objednávky, předplatné, mazlíčci, karta). Doklady zůstávají. */
export async function anonymizeCustomer(formData: FormData) {
  const admin = await requireAdmin("spravce");
  const id = String(formData.get("id") ?? "");
  const db = await getAuthSupabase();
  const { data: c } = await db.from("customers").select("name, email").eq("id", id).maybeSingle();
  if (!c) return flashError("Zákazník nenalezen.");
  const { error } = await db.rpc("anonymize_customer", { p_id: id });
  if (error) return flashError(`Anonymizace selhala: ${error.message}`);
  await logActivity(db, admin, { kind: "zakaznik.anonymizovan", subject: "customer", subjectId: id, text: `Zákazník anonymizován na žádost (GDPR): ${String(formData.get("reason") ?? "").trim()}` });
  revalidatePath("/admin/zakaznici");
  revalidatePath(`/admin/zakaznici/${id}`);
  await flashOk("Osobní údaje byly anonymizovány.");
}
