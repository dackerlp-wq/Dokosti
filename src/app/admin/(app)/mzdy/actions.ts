"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/activity";
import { isMonth, monthLabel, type AttendanceRow, type EmployeeRow, type PayrollItemRow } from "@/lib/admin";
import { flashError, flashOk } from "@/lib/flash";
import { computePayroll, sumHours, type PayrollParams } from "@/lib/payroll";
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
  const { data: m } = await db.from("payroll_months").select("status").eq("month", month).maybeSingle();
  if (m?.status === "uzavreny") return flashError("Měsíc je uzavřený, přepočet není možný.");
  if (!m) await db.from("payroll_months").insert({ month });
  const params = await loadParams(db, Number(month.slice(0, 4)));
  if (!params) return flashError("Chybí parametry roku, doplňte je v Parametrech mezd.");
  const [{ data: emps }, { data: att }, { data: existing }] = await Promise.all([
    db.from("employees").select("*").or(`ended_on.is.null,ended_on.gte.${month}-01`).or(`started_on.is.null,started_on.lte.${month}-31`),
    db.from("attendance").select("employee_id, kind, hours").gte("day", `${month}-01`).lte("day", `${month}-31`).not("employee_id", "is", null),
    db.from("payroll_items").select("*").eq("month", month),
  ]);
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
