"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { CONTRACT_LABEL, type ContractType } from "@/lib/admin";
import { flashError, flashOk } from "@/lib/flash";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

const isContract = (v: string): v is ContractType => v in CONTRACT_LABEL;
const numOrNull = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};

/** Založení nebo úprava zaměstnance (jen správce). */
export async function saveEmployee(fd: FormData) {
  const admin = await requireManager();
  const id = String(fd.get("id") ?? "");
  const name = String(fd.get("name") ?? "").trim().slice(0, 120);
  const contract = String(fd.get("contract_type") ?? "dpp");
  if (name.length < 2) return flashError("Doplňte jméno.");
  if (!isContract(contract)) return flashError("Vyberte typ smlouvy.");
  const row = {
    name,
    position: String(fd.get("position") ?? "").trim().slice(0, 80),
    contract_type: contract,
    hourly_rate_czk: numOrNull(fd.get("hourly_rate_czk")),
    monthly_salary_czk: numOrNull(fd.get("monthly_salary_czk")),
    weekly_hours: numOrNull(fd.get("weekly_hours")),
    started_on: String(fd.get("started_on") ?? "") || null,
    ended_on: String(fd.get("ended_on") ?? "") || null,
    phone: String(fd.get("phone") ?? "").trim().slice(0, 40),
    email: String(fd.get("email") ?? "").trim().slice(0, 120),
    birth_date: String(fd.get("birth_date") ?? "") || null,
    address: String(fd.get("address") ?? "").trim().slice(0, 300),
    note: String(fd.get("note") ?? "").trim().slice(0, 2000),
    bank_account: String(fd.get("bank_account") ?? "").trim().slice(0, 40),
    tax_declaration: fd.get("tax_declaration") === "1",
  };
  const db = await getAuthSupabase();
  const { data, error } = id ? await db.from("employees").update(row).eq("id", id).select("id").single() : await db.from("employees").insert(row).select("id").single();
  if (error) return flashError(`Nepodařilo se uložit: ${error.message}`);
  await logActivity(db, admin, { kind: id ? "zamestnanec.upraven" : "zamestnanec.zalozen", subject: "employee", subjectId: data.id, text: `${id ? "Upraven" : "Založen"} zaměstnanec ${name} (${CONTRACT_LABEL[contract]})` });
  revalidatePath("/admin/zamestnanci");
  revalidatePath(`/admin/zamestnanci/${data.id}`);
  await flashOk(`${name} uložen.`);
  if (!id) redirect(`/admin/zamestnanci/${data.id}`);
}

/** Propojí zaměstnance s přihlášením do systému (účet z Nastavení → Uživatelé). */
export async function linkEmployeeUser(fd: FormData) {
  const admin = await requireManager();
  const id = String(fd.get("id") ?? "");
  const userId = String(fd.get("user_id") ?? "").trim() || null;
  const db = await getAuthSupabase();
  const { data: e } = await db.from("employees").select("name").eq("id", id).maybeSingle();
  const { error } = await db.from("employees").update({ user_id: userId }).eq("id", id);
  if (error) return flashError(error.code === "23505" ? "Tento účet už má jiný zaměstnanec." : error.message);
  // Dřívější směny v kase bez vazby na zaměstnance se dopojí.
  if (userId) await db.from("attendance").update({ employee_id: id }).eq("user_id", userId).is("employee_id", null);
  await logActivity(db, admin, { kind: "zamestnanec.pristup", subject: "employee", subjectId: id, text: `${e?.name ?? "Zaměstnanec"}: ${userId ? "propojen s přihlášením" : "přihlášení odpojeno"}` });
  revalidatePath(`/admin/zamestnanci/${id}`);
  revalidatePath("/admin/dochazka");
  await flashOk(userId ? "Přihlášení propojeno, směny v kase se teď počítají do docházky." : "Přihlášení odpojeno.");
}
