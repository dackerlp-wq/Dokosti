"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { ADMIN_ROLE_LABEL, type AdminRole } from "@/lib/admin";
import { flashError, flashOk } from "@/lib/flash";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

const isRole = (v: string): v is AdminRole => v === "spravce" || v === "obsluha" || v === "brigada";

/** Změna role uživatele administrace (jen správce, ne sám sobě). */
export async function setUserRole(fd: FormData) {
  const admin = await requireManager();
  const userId = String(fd.get("user_id") ?? "");
  const role = String(fd.get("role") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  if (!userId || !isRole(role)) return flashError("Neplatná role.");
  if (userId === admin.id) return flashError("Vlastní roli si změnit nemůžete, požádejte druhého správce.");
  const db = await getAuthSupabase();
  const { error } = await db.rpc("admin_set_role", { p_user_id: userId, p_role: role });
  if (error) return flashError(`Roli se nepodařilo změnit: ${error.message}`);
  await logActivity(db, admin, { kind: "uzivatel.role", subject: "admin", subjectId: userId, text: `${name || "Uživatel"}: role ${ADMIN_ROLE_LABEL[role]}` });
  revalidatePath("/admin/uzivatele");
  await flashOk(`Role změněna na ${ADMIN_ROLE_LABEL[role]}. Platí od příštího načtení stránky.`);
}

/** Odebrání přístupu do administrace (účet v Supabase zůstane, do adminu se nedostane). */
export async function removeUser(fd: FormData) {
  const admin = await requireManager();
  const userId = String(fd.get("user_id") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  if (userId === admin.id) return flashError("Sám sobě přístup odebrat nemůžete.");
  const db = await getAuthSupabase();
  const { error } = await db.rpc("admin_remove", { p_user_id: userId });
  if (error) return flashError(`Přístup se nepodařilo odebrat: ${error.message}`);
  await logActivity(db, admin, { kind: "uzivatel.odebran", subject: "admin", subjectId: userId, text: `Odebrán přístup: ${name || userId}` });
  revalidatePath("/admin/uzivatele");
  await flashOk("Přístup odebrán.");
}
