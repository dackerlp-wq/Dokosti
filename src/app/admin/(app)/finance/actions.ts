"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { EXPENSE_CATEGORY_LABEL, type ExpenseCategory } from "@/lib/admin";
import { flashError, flashOk } from "@/lib/flash";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";
import { closeAutoTask } from "@/lib/tasks";

const isCategory = (v: string): v is ExpenseCategory => v in EXPENSE_CATEGORY_LABEL;
const money = (v: FormDataEntryValue | null) => Math.max(0, Math.round(Number(String(v ?? "").replace(/\s/g, "").replace(",", ".")) * 100) / 100);

function revalidate() {
  revalidatePath("/admin/finance");
  revalidatePath("/admin/finance/vydaje");
  revalidatePath("/admin/finance/splatnosti");
  revalidatePath("/admin");
}

/** Ruční výdaj (účtenka, faktura za službu, nákup vybavení). Příjemky, mzdy a opakované vznikají samy. */
export async function saveExpense(fd: FormData) {
  const admin = await requireManager();
  const id = String(fd.get("id") ?? "");
  const category = String(fd.get("category") ?? "ostatni");
  const description = String(fd.get("description") ?? "").trim().slice(0, 200);
  const amount = money(fd.get("amount_czk"));
  const day = String(fd.get("day") ?? "").trim();
  if (!description || !isCategory(category) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return flashError("Doplňte popis, kategorii a datum.");
  if (!(amount > 0)) return flashError("Zadejte částku.");
  const paid = fd.get("paid") === "1";
  const row = {
    day,
    category,
    description,
    amount_czk: amount,
    supplier: String(fd.get("supplier") ?? "").trim().slice(0, 120),
    document_no: String(fd.get("document_no") ?? "").trim().slice(0, 60),
    due_on: String(fd.get("due_on") ?? "").trim() || null,
    paid_at: paid ? new Date().toISOString() : null,
    note: String(fd.get("note") ?? "").trim().slice(0, 1000),
  };
  const db = await getAuthSupabase();
  const { data, error } = id
    ? await db.from("expenses").update({ ...row, paid_at: paid ? (fd.get("paid_before") ? String(fd.get("paid_before")) : row.paid_at) : null }).eq("id", id).eq("source_type", "rucne").select("id").single()
    : await db.from("expenses").insert({ ...row, source_type: "rucne", created_by: admin.id }).select("id").single();
  if (error || !data) return flashError(`Výdaj se nepodařilo uložit: ${error?.message ?? "neznámá chyba"}`);
  await logActivity(db, admin, { kind: id ? "vydaj.upraven" : "vydaj.zapsan", subject: "expense", subjectId: data.id, text: `${description} (${EXPENSE_CATEGORY_LABEL[category]}): ${Math.round(amount)} Kč${paid ? ", zaplaceno" : ""}` });
  revalidate();
  await flashOk(id ? "Výdaj upraven." : `Výdaj ${Math.round(amount)} Kč zapsán.`);
}

/** Zaplaceno / vrátit mezi nezaplacené. U příjemky se zapíše na příjemku (trigger propíše do výdaje). */
export async function markExpensePaid(fd: FormData) {
  const admin = await requireManager();
  const id = String(fd.get("id") ?? "");
  const undo = fd.get("undo") === "1";
  const db = await getAuthSupabase();
  const { data: e } = await db.from("expenses").select("id, description, amount_czk, source_type, source_id").eq("id", id).maybeSingle();
  if (!e) return flashError("Výdaj nenalezen.");
  const paidAt = undo ? null : new Date().toISOString();
  if (e.source_type === "receipt" && e.source_id) {
    const { error } = await db.from("stock_receipts").update({ paid_at: paidAt }).eq("id", e.source_id);
    if (error) return flashError(error.message);
    if (!undo) await closeAutoTask(db, `invoice-due:${e.source_id}`);
    revalidatePath("/admin/sklad/prijemky");
    revalidatePath("/admin/ukoly");
  } else {
    const { error } = await db.from("expenses").update({ paid_at: paidAt }).eq("id", id);
    if (error) return flashError(error.message);
  }
  await logActivity(db, admin, { kind: undo ? "vydaj.nezaplacen" : "vydaj.zaplacen", subject: "expense", subjectId: id, text: `${e.description}: ${Math.round(Number(e.amount_czk))} Kč ${undo ? "vráceno mezi nezaplacené" : "zaplaceno"}` });
  revalidate();
  await flashOk(undo ? "Vráceno mezi nezaplacené." : "Označeno jako zaplacené.");
}

/** Opakovaný výdaj (nájem, energie, software): každý měsíc v daný den vznikne výdaj k zaplacení. */
export async function saveRecurring(fd: FormData) {
  const admin = await requireManager();
  const id = String(fd.get("id") ?? "");
  const name = String(fd.get("name") ?? "").trim().slice(0, 120);
  const category = String(fd.get("category") ?? "najem");
  const amount = money(fd.get("amount_czk"));
  const day = Math.min(28, Math.max(1, Math.round(Number(fd.get("day_of_month")) || 1)));
  if (!name || !isCategory(category) || !(amount > 0)) return flashError("Doplňte název, kategorii a částku.");
  const row = { name, category, amount_czk: amount, day_of_month: day, supplier: String(fd.get("supplier") ?? "").trim().slice(0, 120), note: String(fd.get("note") ?? "").trim().slice(0, 500), active: fd.get("active") !== "0" };
  const db = await getAuthSupabase();
  const { error } = id ? await db.from("recurring_expenses").update(row).eq("id", id) : await db.from("recurring_expenses").insert(row);
  if (error) return flashError(error.message);
  await logActivity(db, admin, { kind: id ? "vydaj.opakovany.upraven" : "vydaj.opakovany.zalozen", subject: "expense", subjectId: "", text: `Opakovaný výdaj ${name}: ${Math.round(amount)} Kč, ${day}. den v měsíci${row.active ? "" : ", vypnutý"}` });
  // Hned vygenerovat výdaj za tento měsíc, pokud den už nastal.
  await db.rpc("finance_daily");
  revalidate();
  await flashOk(id ? "Opakovaný výdaj upraven." : `Opakovaný výdaj ${name} založen.`);
}
