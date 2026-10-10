"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { isOrderStatus, ORDER_STATUS_LABEL } from "@/lib/admin";
import { sendEmail } from "@/lib/email/send";
import { paymentReminder, statusUpdate, type OrderForEmail } from "@/lib/email/templates";
import { flashError, flashOk } from "@/lib/flash";
import { getSettings } from "@/lib/settings";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

function revalidateOrder(id: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/objednavky");
  revalidatePath("/admin/rozvoz");
  revalidatePath(`/admin/objednavky/${id}`);
}

/** Přidělí objednávce číslo dokladu (číselná řada v databázi) a otevře tisk. Nevratné. */
export async function issueInvoice(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const db = await getAuthSupabase();
  const { error } = await db.rpc("issue_invoice", { p_order_id: id });
  if (error) return flashError(`Doklad se nepodařilo vystavit: ${error.message}`);
  const { data: o } = await db.from("orders").select("order_number, invoice_number").eq("id", id).maybeSingle();
  await logActivity(db, admin, { kind: "objednavka.doklad", subject: "order", subjectId: id, text: `${o?.order_number ?? "Objednávka"}: vystaven doklad ${o?.invoice_number ?? ""}` });
  revalidateOrder(id);
  await flashOk(`Doklad ${o?.invoice_number ?? ""} vystaven.`);
  redirect(`/admin/objednavky/${id}/doklad`);
}

/**
 * Změna stavu objednávky (z detailu i tlačítkem v seznamu). Při skutečné změně odejde e-mail,
 * pokud ho obsluha nevypne. Zrušení přijímá důvod, který se zapíše do deníku i poznámky.
 */
export async function setOrderStatus(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id || !isOrderStatus(status)) return flashError("Neplatný stav objednávky.");
  const db = await getAuthSupabase();
  const { data: before } = await db.from("orders").select("status, order_number, discount_note").eq("id", id).maybeSingle();
  if (!before) return flashError("Objednávka nenalezena.");
  if (before.status === status) return flashOk(`Objednávka už je ve stavu ${ORDER_STATUS_LABEL[status]}.`);
  const { error } = await db.from("orders").update({ status }).eq("id", id);
  if (error) return flashError(`Stav se nepodařilo uložit: ${error.message}`);

  // E-mail zákazníkovi jen při skutečné změně a jen u stavů, které mají šablonu.
  let mailed = false;
  if (formData.get("notify") !== "off") {
    const [{ data: order }, { data: items }, settings] = await Promise.all([
      db.from("orders").select("*").eq("id", id).maybeSingle(),
      db.from("order_items").select("name, qty, unit_price_czk").eq("order_id", id),
      getSettings(),
    ]);
    if (order && order.customer_email) {
      const msg = statusUpdate({ ...(order as OrderForEmail), items: items ?? [] }, settings, status);
      if (msg) {
        await sendEmail(db, order.customer_email, msg, `stav-${status}`, id);
        mailed = true;
      }
    }
  }
  await logActivity(db, admin, {
    kind: "objednavka.stav",
    subject: "order",
    subjectId: id,
    text: `${before.order_number}: ${ORDER_STATUS_LABEL[before.status as keyof typeof ORDER_STATUS_LABEL]} → ${ORDER_STATUS_LABEL[status]}${reason ? ` (${reason})` : ""}${mailed ? ", e-mail odeslán" : ""}`,
    data: { from: before.status, to: status, reason, mailed },
  });
  revalidateOrder(id);
  await flashOk(`${before.order_number}: ${ORDER_STATUS_LABEL[status]}.${mailed ? " Zákazníkovi odešel e-mail." : ""}`);
}

/** Označí objednávku jako zaplacenou (převod připsán, zaplaceno u pultu), nebo označení zruší. */
export async function setOrderPaid(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const paid = formData.get("paid") === "1";
  if (!id) return;
  const db = await getAuthSupabase();
  const { error } = await db.from("orders").update({ paid_at: paid ? new Date().toISOString() : null }).eq("id", id);
  if (error) return flashError(`Nepodařilo se uložit: ${error.message}`);
  const { data: o } = await db.from("orders").select("order_number").eq("id", id).maybeSingle();
  await logActivity(db, admin, { kind: paid ? "objednavka.zaplaceno" : "objednavka.nezaplaceno", subject: "order", subjectId: id, text: `${o?.order_number ?? "Objednávka"}: ${paid ? "označena jako zaplacená" : "zrušeno označení zaplaceno"}` });
  revalidateOrder(id);
  await flashOk(paid ? "Označeno jako zaplaceno." : "Označení zaplaceno zrušeno.");
}

/** Interní poznámka k objednávce (zákazník ji nevidí). Ukládá se do discount_note? Ne: do samostatného sloupce internal_note. */
export async function saveOrderNote(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("internal_note") ?? "").trim().slice(0, 2000);
  const db = await getAuthSupabase();
  const { error } = await db.from("orders").update({ internal_note: note }).eq("id", id);
  if (error) return flashError(`Poznámku se nepodařilo uložit: ${error.message}`);
  const { data: o } = await db.from("orders").select("order_number").eq("id", id).maybeSingle();
  await logActivity(db, admin, { kind: "objednavka.poznamka", subject: "order", subjectId: id, text: `${o?.order_number ?? "Objednávka"}: interní poznámka upravena` });
  revalidateOrder(id);
  await flashOk("Poznámka uložena.");
}

/** Pošle zákazníkovi připomínku nezaplacené objednávky (převod) s číslem účtu a VS. */
export async function sendPaymentReminder(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const db = await getAuthSupabase();
  const [{ data: order }, { data: items }, settings] = await Promise.all([db.from("orders").select("*").eq("id", id).maybeSingle(), db.from("order_items").select("name, qty, unit_price_czk").eq("order_id", id), getSettings()]);
  if (!order) return flashError("Objednávka nenalezena.");
  if (order.paid_at) return flashError("Objednávka už je zaplacená.");
  if (!order.customer_email) return flashError("Zákazník nemá e-mail, zavolejte mu.");
  await sendEmail(db, order.customer_email, paymentReminder({ ...(order as OrderForEmail), items: items ?? [] }, settings), "pripominka-platby", id);
  await logActivity(db, admin, { kind: "objednavka.pripominka", subject: "order", subjectId: id, text: `${order.order_number}: odeslána připomínka platby na ${order.customer_email}` });
  revalidateOrder(id);
  await flashOk("Připomínka platby odeslána.");
}
