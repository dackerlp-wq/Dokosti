import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/admin/print-button";
import { CONTRACT_LABEL, formatDate, monthLabel, type PayrollItemRow, type PayrollMonthRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { getAdmin, getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Výplatní páska" };

/** Orientační výplatní páska k tisku. Správce vidí vše, zaměstnanec svou po uzavření měsíce (RLS). */
export default async function PayslipPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("brigada");
  const admin = (await getAdmin())!;
  const { id } = await params;
  const [db, settings] = await Promise.all([getAuthSupabase(), getSettings()]);
  const { data } = await db.from("payroll_items").select("*, payroll_months(*), employees(position, bank_account, tax_declaration)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const r = data as unknown as PayrollItemRow & { payroll_months: PayrollMonthRow | null; employees: { position: string; bank_account: string; tax_declaration: boolean } | null };
  const closed = r.payroll_months?.status === "uzavreny";
  const lines = (r.breakdown ?? []) as { label: string; amount: number; kind?: string }[];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <p className="text-eyebrow uppercase text-muted">
            {admin.isManager ? (
              <Link href={`/admin/mzdy?mesic=${r.month}`} className="hover:underline">
                Mzdy
              </Link>
            ) : (
              "Moje mzda"
            )}{" "}
            · {monthLabel(r.month)}
          </p>
          <h1>Výplatní páska</h1>
          <p className="text-sm text-muted">{closed ? `Měsíc uzavřen ${r.payroll_months?.closed_at ? formatDate(r.payroll_months.closed_at) : ""}.` : "Měsíc je ještě otevřený, čísla se mohou změnit."} Orientační výpočet, oficiální pásku vystavuje účetní.</p>
        </div>
        <PrintButton />
      </div>
      <div className="mx-auto max-w-[700px] rounded-card border border-line bg-white p-6 text-[13px] print:max-w-none print:border-0 print:p-0">
        <div className="flex items-start justify-between gap-4 border-b border-line pb-3">
          <div>
            <p className="text-[22px] font-semibold leading-tight">{settings.shop.name}</p>
            <p className="text-muted">{[settings.shop.address, settings.shop.city].filter(Boolean).join(", ")}</p>
          </div>
          <div className="text-right">
            <p className="text-eyebrow uppercase text-muted">Výplatní páska</p>
            <p className="text-[20px] font-semibold">{monthLabel(r.month)}</p>
            <p className="text-eyebrow uppercase text-brick-text">{closed ? "orientační" : "předběžná, orientační"}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
          <p>
            <span className="text-muted">Zaměstnanec:</span> <span className="font-semibold">{r.employee_name}</span>
          </p>
          <p>
            <span className="text-muted">Smlouva:</span> {CONTRACT_LABEL[r.contract_type]}
          </p>
          {r.employees?.position && (
            <p>
              <span className="text-muted">Pozice:</span> {r.employees.position}
            </p>
          )}
          <p>
            <span className="text-muted">Prohlášení poplatníka:</span> {r.employees?.tax_declaration ? "ano" : "ne"}
          </p>
          <p>
            <span className="text-muted">Odpracováno:</span> {Number(r.hours_work).toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} h
            {Number(r.hours_vacation) > 0 ? `, dovolená ${r.hours_vacation} h` : ""}
            {Number(r.hours_sick) > 0 ? `, nemoc ${r.hours_sick} h` : ""}
            {Number(r.hours_holiday) > 0 ? `, svátek ${r.hours_holiday} h` : ""}
          </p>
          <p>
            <span className="text-muted">Sazba:</span> {r.monthly_salary_czk ? `${Number(r.monthly_salary_czk).toLocaleString("cs-CZ")} Kč/měsíc` : r.hourly_rate_czk ? `${Number(r.hourly_rate_czk).toLocaleString("cs-CZ")} Kč/h` : "—"}
          </p>
        </div>
        <table className="mt-4 w-full">
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className={`border-b border-line ${l.kind === "base" ? "font-semibold" : ""} ${l.kind === "info" ? "text-muted" : ""}`}>
                <td className="py-1.5 pr-3">{l.label}</td>
                <td className={`py-1.5 text-right whitespace-nowrap ${l.amount < 0 ? "text-brick-text" : ""}`}>{l.kind === "info" && l.amount === 0 ? "" : formatPrice(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex items-end justify-between gap-4 rounded-card bg-paper p-4">
          <div>
            <p className="text-eyebrow uppercase text-muted">K výplatě</p>
            {r.employees?.bank_account && <p className="text-small text-muted">na účet {r.employees.bank_account}</p>}
          </div>
          <p className="text-[28px] font-semibold leading-none">{formatPrice(Number(r.net_czk))}</p>
        </div>
        {r.note && <p className="mt-3 text-small italic text-muted">Poznámka: {r.note}</p>}
        <p className="mt-4 text-[11px] text-muted">
          Orientační výpočet z interního systému ({new Date(r.updated_at).toLocaleDateString("cs-CZ")}). Nezohledňuje slevy na děti, exekuce, průměrný výdělek pro náhrady a další individuální položky; závazná je páska od účetní.
        </p>
      </div>
    </>
  );
}
