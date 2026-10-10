"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { flashError, flashOk } from "@/lib/flash";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

/** Založení nebo úprava dodavatele. */
export async function saveSupplier(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const name = String(fd.get("name") ?? "").trim().slice(0, 120);
  if (name.length < 2) return flashError("Doplňte název dodavatele.");
  const weekday = String(fd.get("order_weekday") ?? "");
  const row = {
    name,
    contact: String(fd.get("contact") ?? "").trim().slice(0, 120),
    email: String(fd.get("email") ?? "").trim().slice(0, 120),
    phone: String(fd.get("phone") ?? "").trim().slice(0, 40),
    order_weekday: weekday === "" ? null : Math.min(6, Math.max(0, Number(weekday))),
    lead_days: Math.min(60, Math.max(0, Math.round(Number(fd.get("lead_days")) || 0))),
    min_order_czk: Math.max(0, Math.round(Number(fd.get("min_order_czk")) || 0)),
    note: String(fd.get("note") ?? "").trim().slice(0, 1000),
    active: fd.get("active") !== "off",
  };
  const db = await getAuthSupabase();
  const { data, error } = id ? await db.from("suppliers").update(row).eq("id", id).select("id").single() : await db.from("suppliers").insert(row).select("id").single();
  if (error) return flashError(`Dodavatele se nepodařilo uložit: ${error.message}`);
  await logActivity(db, admin, { kind: id ? "dodavatel.upraven" : "dodavatel.zalozen", subject: "product", subjectId: "", text: `${id ? "Upraven" : "Založen"} dodavatel ${name}` });
  revalidatePath("/admin/dodavatele");
  await flashOk(`Dodavatel ${name} uložen.`);
  if (!id) redirect(`/admin/dodavatele/${data.id}`);
}

/** Přiřadí produkty dodavateli (z detailu dodavatele). */
export async function assignProducts(fd: FormData) {
  const admin = await requireAdmin();
  const supplierId = String(fd.get("supplier_id") ?? "");
  const ids = fd.getAll("product_id").map(String).filter(Boolean);
  const db = await getAuthSupabase();
  const { data: s } = await db.from("suppliers").select("name").eq("id", supplierId).maybeSingle();
  // Nejdřív odebrat všechny, pak nastavit zaškrtnuté: jeden formulář = úplný stav.
  const { error: e1 } = await db.from("products").update({ supplier_id: null }).eq("supplier_id", supplierId);
  const { error: e2 } = ids.length ? await db.from("products").update({ supplier_id: supplierId }).in("id", ids) : { error: null };
  if (e1 || e2) return flashError((e1 ?? e2)!.message);
  await logActivity(db, admin, { kind: "dodavatel.produkty", subject: "product", subjectId: "", text: `${s?.name ?? "Dodavatel"}: ${ids.length} produktů` });
  revalidatePath(`/admin/dodavatele/${supplierId}`);
  revalidatePath("/admin/produkty");
  await flashOk(`Uloženo, ${ids.length} produktů.`);
}
