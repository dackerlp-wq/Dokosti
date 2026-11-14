"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { isMonth, monthEnd, monthLabel, type AttendanceRow, type EmployeeRow, type PayrollItemRow, type PayrollMonthRow } from "@/lib/admin";
import { flashError, flashOk } from "@/lib/flash";
import { computePayroll, PAYSLIP_SELECT, payslipNumber, payslipSeq, sumHours, type PayrollParams, type PayslipEmployee } from "@/lib/payroll";
import { payslipFileName, renderPayslipPdf } from "@/lib/pdf/payslip";
import { getSettings } from "@/lib/settings";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

async function loadParams(db: Awaited<ReturnType<typeof getAuthSupabase>>, year: number): Promise<PayrollParams | null> {
  const { data } = await db.from("payroll_params").select("*").eq("year", year).maybeSingle();
  if (data) return data as PayrollParams;
  const { data: last } = await db.from("payroll_params").select("*").order("year", { ascending: false }).limit(1).maybeSingle();
  return (last as PayrollParams | null) ?? null;
}

/**
 * Přepočet otevřeného měsíce z docházky a sazeb. Ruční odměny, srážky a poznámky zůstávají.
 * Volá se z tlačítka i automaticky při otevření měsíce.
 */
export async function recomputeMonth(fd: FormData) {
  const admin = await requireManager();
  const month = String(fd.get("month") ?? "");
  if (!isMonth(month)) return flashError("Neplatný měsíc.");
  const db = await getAuthSupabase();
  const { data: m, error: mErr } = await db.from("payroll_months").select("status").eq("month", month).maybeSingle();
  if (mErr) return flashError(`Měsíc se nepodařilo načíst: ${mErr.message}`);
  if (m?.status === "uzavreny") return flashError("Měsíc je uzavřený, přepočet není možný.");
  if (!m) {
    const { error } = await db.from("payroll_months").insert({ month });
    if (error) return flashError(`Měsíc se nepodařilo založit: ${error.message}`);
  }
  const params = await loadParams(db, Number(month.slice(0, 4)));
  if (!params) return flashError("Chybí parametry roku, doplňte je v Parametrech mezd.");
  const lastDay = monthEnd(month);
  const [emp, attendance, items] = await Promise.all([
    db.from("employees").select("*").or(`ended_on.is.null,ended_on.gte.${month}-01`).or(`started_on.is.null,started_on.lte.${lastDay}`),
    db.from("attendance").select("employee_id, kind, hours").gte("day", `${month}-01`).lte("day", lastDay).not("employee_id", "is", null),
    db.from("payroll_items").select("*").eq("month", month),
  ]);
  // Čtení musí projít: s prázdným výsledkem by se existující řádky zkoušely vložit znovu.
  const readErr = emp.error ?? attendance.error ?? items.error;
  if (readErr) return flashError(`Podklady se nepodařilo načíst: ${readErr.message}`);
  const emps = emp.data;
  const att = attendance.data;
  const existing = items.data;
  const prev = new Map(((existing ?? []) as PayrollItemRow[]).map((i) => [i.employee_id, i]));
  const byEmp = new Map<string, Pick<AttendanceRow, "kind" | "hours">[]>();
  for (const a of (att ?? []) as Pick<AttendanceRow, "employee_id" | "kind" | "hours">[]) byEmp.set(a.employee_id!, [...(byEmp.get(a.employee_id!) ?? []), a]);
  let count = 0;
  for (const e of (emps ?? []) as EmployeeRow[]) {
    const hours = sumHours(byEmp.get(e.id) ?? []);
    const old = prev.get(e.id);
    const hasAnything = hours.hoursWork + hours.hoursVacation + hours.hoursSick + hours.hoursHoliday > 0 || Number(e.monthly_salary_czk ?? 0) > 0 || !!old;
    if (!hasAnything) continue;
    const r = computePayroll(params, { contract: e.contract_type, hourlyRate: e.hourly_rate_czk, monthlySalary: e.monthly_salary_czk, ...hours, bonus: Number(old?.bonus_czk ?? 0), deduction: Number(old?.deduction_czk ?? 0), taxDeclaration: e.tax_declaration });
    const row = {
      month,
      employee_id: e.id,
      employee_name: e.name,
      contract_type: e.contract_type,
      hours_work: hours.hoursWork,
      hours_vacation: hours.hoursVacation,
      hours_sick: hours.hoursSick,
      hours_holiday: hours.hoursHoliday,
      hourly_rate_czk: e.hourly_rate_czk,
      monthly_salary_czk: e.monthly_salary_czk,
      gross_czk: r.gross,
      emp_levies_czk: r.empLevies,
      tax_czk: r.tax,
      net_czk: r.net,
      er_levies_czk: r.erLevies,
      employer_cost_czk: r.employerCost,
      breakdown: r.breakdown,
      updated_at: new Date().toISOString(),
    };
    const { error } = old ? await db.from("payroll_items").update(row).eq("id", old.id) : await db.from("payroll_items").insert(row);
    if (error) return flashError(`Přepočet selhal u ${e.name}: ${error.message}`);
    count++;
  }
  await logActivity(db, admin, { kind: "mzdy.prepocet", subject: "payroll", subjectId: month, text: `Mzdy ${monthLabel(month)}: přepočteno ${count} lidí z docházky` });
  revalidatePath("/admin/mzdy");
  await flashOk(`Přepočteno z docházky: ${count} lidí.`);
}

/** Odměna, srážka a poznámka u jednoho člověka (přepočítá řádek). */
export async function savePayrollItem(fd: FormData) {
  const admin = await requireManager();
  const id = String(fd.get("id") ?? "");
  const db = await getAuthSupabase();
  const { data } = await db.from("payroll_items").select("*, payroll_months!inner(status), employees(tax_declaration)").eq("id", id).maybeSingle();
  if (!data) return flashError("Řádek nenalezen.");
  const item = data as unknown as PayrollItemRow & { payroll_months: { status: string }; employees: { tax_declaration: boolean } | null };
  if (item.payroll_months.status === "uzavreny") return flashError("Měsíc je uzavřený.");
  const params = await loadParams(db, Number(item.month.slice(0, 4)));
  if (!params) return flashError("Chybí parametry roku.");
  const bonus = Math.max(0, Math.round(Number(String(fd.get("bonus_czk") ?? "0").replace(",", ".")) || 0));
  const deduction = Math.max(0, Math.round(Number(String(fd.get("deduction_czk") ?? "0").replace(",", ".")) || 0));
  const r = computePayroll(params, { contract: item.contract_type, hourlyRate: item.hourly_rate_czk, monthlySalary: item.monthly_salary_czk, hoursWork: Number(item.hours_work), hoursVacation: Number(item.hours_vacation), hoursSick: Number(item.hours_sick), hoursHoliday: Number(item.hours_holiday), bonus, deduction, taxDeclaration: item.employees?.tax_declaration ?? false });
  const { error } = await db.from("payroll_items").update({ bonus_czk: bonus, deduction_czk: deduction, note: String(fd.get("note") ?? "").trim().slice(0, 500), gross_czk: r.gross, emp_levies_czk: r.empLevies, tax_czk: r.tax, net_czk: r.net, er_levies_czk: r.erLevies, employer_cost_czk: r.employerCost, breakdown: r.breakdown, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return flashError(error.message);
  await logActivity(db, admin, { kind: "mzdy.polozka", subject: "payroll", subjectId: item.month, text: `${item.employee_name}, ${monthLabel(item.month)}: odměna ${bonus} Kč, srážka ${deduction} Kč, čistá ${r.net} Kč` });
  revalidatePath("/admin/mzdy");
  await flashOk(`${item.employee_name}: uloženo, čistá mzda ${r.net.toLocaleString("cs-CZ")} Kč.`);
}

/** Uzavření měsíce: zmrazí podklady a zapíše výdaje (mzdy = hrubé, odvody zaměstnavatele). */
export async function closeMonth(fd: FormData) {
  const admin = await requireManager();
  const month = String(fd.get("month") ?? "");
  const reopen = fd.get("reopen") === "1";
  if (!isMonth(month)) return flashError("Neplatný měsíc.");
  const db = await getAuthSupabase();
  const { data: items } = await db.from("payroll_items").select("*").eq("month", month);
  const list = (items ?? []) as PayrollItemRow[];
  if (reopen) {
    const { error } = await db.from("payroll_months").update({ status: "otevreny", closed_at: null, closed_by: null }).eq("month", month);
    if (error) return flashError(error.message);
    // Výdaje z mezd vynulovat (ne mazat): po novém uzavření se přepíší.
    await db.from("expenses").update({ amount_czk: 0, note: "Měsíc znovu otevřen, částka se doplní při uzavření." }).eq("source_type", "payroll").in("source_id", [`${month}:mzdy`, `${month}:odvody`]);
    await logActivity(db, admin, { kind: "mzdy.otevren", subject: "payroll", subjectId: month, text: `Mzdy ${monthLabel(month)} znovu otevřeny` });
    revalidatePath("/admin/mzdy");
    revalidatePath("/admin/finance");
    await flashOk("Měsíc znovu otevřen. Po úpravách ho zase uzavřete.");
    return;
  }
  if (list.length === 0) return flashError("Měsíc nemá žádné podklady, nejdřív přepočítejte.");
  const gross = list.reduce((n, i) => n + Number(i.gross_czk), 0);
  const er = list.reduce((n, i) => n + Number(i.er_levies_czk), 0);
  const lastDay = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0);
  const day = lastDay.toISOString().slice(0, 10);
  const due = new Date(lastDay);
  due.setDate(due.getDate() + 15);
  const dueOn = due.toISOString().slice(0, 10);
  const { error } = await db.from("payroll_months").update({ status: "uzavreny", closed_at: new Date().toISOString(), closed_by: admin.id, note: String(fd.get("note") ?? "").trim().slice(0, 500) }).eq("month", month);
  if (error) return flashError(error.message);
  const rows = [
    { day, category: "mzdy", description: `Mzdy ${monthLabel(month)}`, amount_czk: gross, source_type: "payroll", source_id: `${month}:mzdy`, due_on: dueOn, note: `${list.length} lidí, hrubé mzdy`, created_by: admin.id },
    { day, category: "odvody", description: `Odvody zaměstnavatele ${monthLabel(month)}`, amount_czk: er, source_type: "payroll", source_id: `${month}:odvody`, due_on: dueOn, note: "Sociální a zdravotní pojištění za zaměstnavatele", created_by: admin.id },
  ];
  for (const r of rows) {
    const { data: ex } = await db.from("expenses").select("id").eq("source_type", "payroll").eq("source_id", r.source_id).maybeSingle();
    if (ex) await db.from("expenses").update({ amount_czk: r.amount_czk, note: r.note, day: r.day, due_on: r.due_on }).eq("id", ex.id);
    else if (r.amount_czk > 0) await db.from("expenses").insert(r);
  }
  await logActivity(db, admin, { kind: "mzdy.uzavren", subject: "payroll", subjectId: month, text: `Mzdy ${monthLabel(month)} uzavřeny: ${list.length} lidí, hrubé ${Math.round(gross)} Kč, odvody ${Math.round(er)} Kč` });
  revalidatePath("/admin/mzdy");
  revalidatePath("/admin/finance");
  revalidatePath("/admin/finance/vydaje");
  await flashOk(`Měsíc ${monthLabel(month)} uzavřen, výdaje za mzdy a odvody zapsány do Financí.`);
}

/**
 * Vygenerování výplatních pásek za uzavřený měsíc (nebo jedné položky přes `id`): PDF do bucketu dokumenty
 * (pasky/RRRR-MM), dokument navázaný na zaměstnance (vidí ho mezi svými dokumenty) a číslo pásky.
 * Přegenerování přepíše soubor, číslo pásky zůstává.
 */
export async function generatePayslips(fd: FormData) {
  const admin = await requireManager();
  const month = String(fd.get("month") ?? "");
  const onlyId = String(fd.get("id") ?? "");
  if (!isMonth(month)) return flashError("Neplatný měsíc.");
  const [db, settings] = await Promise.all([getAuthSupabase(), getSettings()]);
  const { data: m } = await db.from("payroll_months").select("*").eq("month", month).maybeSingle();
  const pm = m as PayrollMonthRow | null;
  if (pm?.status !== "uzavreny") return flashError("Pásky se generují až po uzavření měsíce.");
  const { data } = await db.from("payroll_items").select(PAYSLIP_SELECT).eq("month", month).order("employee_name");
  type Row = PayrollItemRow & { payroll_months: PayrollMonthRow | null; employees: PayslipEmployee | null };
  const all = (data ?? []) as unknown as Row[];
  const rows = onlyId ? all.filter((r) => r.id === onlyId) : all;
  if (rows.length === 0) return flashError("Není co generovat.");
  let seq = Math.max(0, ...all.map((r) => payslipSeq(r.payslip_no)));
  const now = new Date().toISOString();
  let done = 0;
  let lastNo = "";
  for (const r of rows) {
    const no = r.payslip_no ?? payslipNumber(month, ++seq);
    lastNo = no;
    const item = { ...r, payslip_no: no, payslip_generated_at: now };
    const pdf = await renderPayslipPdf({ item, month: pm, employee: r.employees, shop: settings.shop });
    const fileName = payslipFileName(item);
    const path = r.payslip_path ?? `pasky/${month}/${fileName}`;
    const { error: upErr } = await db.storage.from("dokumenty").upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (upErr) return flashError(`Pásku ${r.employee_name} se nepodařilo uložit: ${upErr.message}`);
    let documentId = r.payslip_document_id;
    if (documentId) {
      await db.from("document_versions").update({ storage_path: path, file_name: fileName, mime: "application/pdf", size_bytes: pdf.length, note: `Přegenerováno ${new Date(now).toLocaleDateString("cs-CZ")}`, created_by: admin.id }).eq("document_id", documentId).eq("version", 1);
    } else {
      const { data: doc, error: docErr } = await db
        .from("documents")
        .insert({ title: `Výplatní páska ${monthLabel(month)}`, category: "zamestnanci", linked_type: "employee", linked_id: r.employee_id, remind_days: 0, note: `Páska ${no}, orientační výpočet z interního systému.`, created_by: admin.id })
        .select("id")
        .single();
      if (docErr || !doc) return flashError(`Dokument pásky ${r.employee_name} se nepodařilo založit: ${docErr?.message ?? ""}`);
      documentId = doc.id as string;
      const { error: verErr } = await db.from("document_versions").insert({ document_id: documentId, version: 1, storage_path: path, file_name: fileName, mime: "application/pdf", size_bytes: pdf.length, created_by: admin.id });
      if (verErr) return flashError(`Verze dokumentu ${r.employee_name}: ${verErr.message}`);
    }
    const { error } = await db.from("payroll_items").update({ payslip_no: no, payslip_path: path, payslip_generated_at: now, payslip_generated_by: admin.id, payslip_document_id: documentId }).eq("id", r.id);
    if (error) return flashError(`Záznam pásky ${r.employee_name}: ${error.message}`);
    done++;
  }
  await logActivity(db, admin, { kind: "mzdy.pasky", subject: "payroll", subjectId: month, text: `Mzdy ${monthLabel(month)}: vygenerováno ${done} výplatních pásek${onlyId ? ` (${rows[0].employee_name})` : ""}` });
  revalidatePath("/admin/mzdy");
  revalidatePath("/admin/dokumenty");
  await flashOk(done === 1 ? `Výplatní páska ${rows[0].employee_name} (${lastNo}) vygenerována.` : `Vygenerováno ${done} výplatních pásek za ${monthLabel(month)}.`);
}

/** Parametry roku (minimální mzda, limity DPP/DPČ, sazby). Výchozí hodnoty správce potvrdí s účetní. */
export async function saveParams(fd: FormData) {
  const admin = await requireManager();
  const year = Math.round(Number(fd.get("year")));
  if (!(year >= 2024 && year <= 2100)) return flashError("Neplatný rok.");
  const num = (k: string) => Number(String(fd.get(k) ?? "").replace(",", ".")) || 0;
  const row = {
    year,
    min_wage_czk: num("min_wage_czk"),
    dpp_limit_czk: num("dpp_limit_czk"),
    dpc_limit_czk: num("dpc_limit_czk"),
    tax_rate_pct: num("tax_rate_pct"),
    tax_credit_czk: num("tax_credit_czk"),
    emp_social_pct: num("emp_social_pct"),
    emp_health_pct: num("emp_health_pct"),
    er_social_pct: num("er_social_pct"),
    er_health_pct: num("er_health_pct"),
    verified: fd.get("verified") === "1",
    note: String(fd.get("note") ?? "").trim().slice(0, 500),
    updated_at: new Date().toISOString(),
  };
  const db = await getAuthSupabase();
  const { error } = await db.from("payroll_params").upsert(row);
  if (error) return flashError(error.message);
  await logActivity(db, admin, { kind: "mzdy.parametry", subject: "payroll", subjectId: String(year), text: `Parametry mezd ${year} uloženy${row.verified ? " (potvrzeno účetní)" : ""}` });
  revalidatePath("/admin/mzdy/parametry");
  revalidatePath("/admin/mzdy");
  await flashOk(`Parametry roku ${year} uloženy.`);
  redirect(`/admin/mzdy/parametry?rok=${year}`);
}
