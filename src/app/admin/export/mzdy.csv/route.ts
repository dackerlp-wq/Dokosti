import { CONTRACT_LABEL, isMonth, type PayrollItemRow } from "@/lib/admin";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

/** Podklady pro účetní: jeden řádek na člověka a měsíc (hodiny, sazba, odměny, orientační výpočet). */
export async function GET(request: Request) {
  await requireManager();
  const sp = new URL(request.url).searchParams;
  const month = sp.get("mesic") ?? "";
  if (!isMonth(month)) return new Response("Chybí měsíc.", { status: 400 });
  const db = await getAuthSupabase();
  const { data } = await db.from("payroll_items").select("*, employees(email, phone, birth_date, address, bank_account, tax_declaration, started_on, ended_on)").eq("month", month).order("employee_name");
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const n = (v: unknown) => String(Number(v ?? 0)).replace(".", ",");
  const head = ["Měsíc", "Jméno", "Smlouva", "Prohlášení", "Nástup", "Ukončení", "Odpracováno h", "Dovolená h", "Nemoc h", "Svátek h", "Sazba Kč/h", "Měsíční mzda", "Odměna", "Srážka", "Hrubá (odhad)", "Odvody zam. (odhad)", "Daň (odhad)", "Čistá (odhad)", "Odvody zamst. (odhad)", "Náklad (odhad)", "Účet", "E-mail", "Telefon", "Datum narození", "Adresa", "Poznámka"];
  type Row = PayrollItemRow & { employees: { email: string; phone: string; birth_date: string | null; address: string; bank_account: string; tax_declaration: boolean; started_on: string | null; ended_on: string | null } | null };
  const lines = ((data ?? []) as unknown as Row[]).map((r) =>
    [month, r.employee_name, CONTRACT_LABEL[r.contract_type], r.employees?.tax_declaration ? "ano" : "ne", r.employees?.started_on ?? "", r.employees?.ended_on ?? "", n(r.hours_work), n(r.hours_vacation), n(r.hours_sick), n(r.hours_holiday), r.hourly_rate_czk ? n(r.hourly_rate_czk) : "", r.monthly_salary_czk ? n(r.monthly_salary_czk) : "", n(r.bonus_czk), n(r.deduction_czk), n(r.gross_czk), n(r.emp_levies_czk), n(r.tax_czk), n(r.net_czk), n(r.er_levies_czk), n(r.employer_cost_czk), r.employees?.bank_account ?? "", r.employees?.email ?? "", r.employees?.phone ?? "", r.employees?.birth_date ?? "", r.employees?.address ?? "", r.note].map(esc).join(";"),
  );
  const csv = "﻿" + [head.map(esc).join(";"), ...lines].join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="mzdy-${month}.csv"` } });
}
