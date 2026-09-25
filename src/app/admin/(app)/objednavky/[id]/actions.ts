"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isOrderStatus } from "@/lib/admin";
import { sendEmail } from "@/lib/email/send";
import { statusUpdate, type OrderForEmail } from "@/lib/email/templates";
import { getSettings } from "@/lib/settings";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

/** Přidělí objednávce číslo dokladu (číselná řada v databázi) a otevře tisk. */
export async function issueInvoice(formData: FormData) {
  if (!(await getAdmin())) throw new Error("Nepřihlášený uživatel");
  const id = String(formData.get("id") ?? "");
  const db = await getAuthSupabase();
  const { error } = await db.rpc("issue_invoice", { p_order_id: id });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/objednavky/${id}`);
  redirect(`/admin/objednavky/${id}/doklad`);
}

export async function setOrderStatus(formData: FormData) {
  if (!(await getAdmin())) throw new Error("Nepřihlášený uživatel");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !isOrderStatus(status)) return;
  const db = await getAuthSupabase();
  const { data: before } = await db.from("orders").select("status").eq("id", id).maybeSingle();
  const { error } = await db.from("orders").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  // E-mail zákazníkovi jen při skutečné změně a jen u stavů, které mají šablonu.
  if (before && before.status !== status && formData.get("notify") !== "off") {
    const [{ data: order }, { data: items }, settings] = await Promise.all([
      db.from("orders").select("*").eq("id", id).maybeSingle(),
      db.from("order_items").select("name, qty, unit_price_czk").eq("order_id", id),
      getSettings(),
    ]);
    if (order) {
      const msg = statusUpdate({ ...(order as OrderForEmail), items: items ?? [] }, settings, status);
      if (msg) await sendEmail(db, order.customer_email, msg, `stav-${status}`, id);
    }
  }
  revalidatePath("/admin");
  revalidatePath("/admin/objednavky");
  revalidatePath(`/admin/objednavky/${id}`);
}
