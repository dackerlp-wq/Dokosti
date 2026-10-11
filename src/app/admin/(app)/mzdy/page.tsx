import type { Metadata } from "next";
import Link from "next/link";
import { closeMonth, recomputeMonth, savePayrollItem } from "@/app/admin/(app)/mzdy/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PageHeader } from "@/components/admin/page-header";
import { Pills, Stat } from "@/components/admin/stat";
import { Table, Td } from "@/components/admin/table";
import { Button } from "@/components/ui/button";
import { CONTRACT_LABEL, formatDate, isMonth, monthLabel, shiftMonth, type PayrollItemRow, type PayrollMonthRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import type { PayrollParams } from "@/lib/payroll";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Mzdy" };

/**
 * Podklady pro mzdy za měsíc: hodiny z docházky, sazby z karty zaměstnance, orientační výpočet.
 * Odměny a srážky ručně, uzavření měsíce zapíše výdaje. Oficiální mzdy dělá účetní z exportu.
 */
export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ mesic?: string }> }) {
  await requireManager();
  const sp = await searchParams;
  const current = new Date().toISOString().slice(0, 7);
  const month = isMonth(sp.mesic) ? sp.mesic : shiftMonth(current, new Date().getDate() <= 5 ? -1 : 0);
  const db = await getAuthSupabase();
  const [{ data: m }, { data: items }, { data: params }, { data: months }] = await Promise.all([
    db.from("payroll_months").select("*").eq("month", month).maybeSingle(),
    db.from("payroll_items").select("*").eq("month", month).order("employee_name"),
    db.from("payroll_params").select("*").eq("year", Number(month.slice(0, 4))).maybeSingle(),
    db.from("payroll_months").select("month, status").order("month", { ascending: false }).limit(12),
  ]);
  const pm = m as PayrollMonthRow | null;
  const rows = (items ?? []) as PayrollItemRow[];
  const p = params as PayrollParams | null;
  const closed = pm?.status === "uzavreny";
  const sum = (k: keyof PayrollItemRow) => rows.reduce((n, r) => n + Number(r[k] ?? 0), 0);
  const warnings = new Set<string>();
  if (!p) warnings.add(`Pro rok ${month.slice(0, 4)} nejsou zadané parametry mezd.`);
  else if (!p.verified) warnings.add(`Parametry roku ${month.slice(0, 4)} ještě nepotvrdila účetní, výpočet je orientační.`);
  for (const r of rows) if (!r.hourly_rate_czk && !r.monthly_salary_czk) warnings.add(`${r.employee_name} nemá sazbu ani měsíční mzdu.`);

  return (
    <>
      <PageHeader
        title="Mzdy"
        subtitle="Podklady z docházky a sazeb, orientační výpočet čisté mzdy a nákladů. Odměny a srážky doplníte v řádku. Uzavření měsíce zmrazí podklady a zapíše mzdy do výdajů; oficiální výpočet dělá účetní z exportu."
        actions={
          <>
            <Link href={`/admin/mzdy/parametry?rok=${month.slice(0, 4)}`} className="text-button inline-flex min-h-9 items-center rounded-control border border-line px-3 text-green hover:border-green">
              Parametry {month.slice(0, 4)}{p?.verified ? " ✓" : ""}
            </Link>
            <a href={`/admin/export/mzdy.csv?mesic=${month}`} className="text-button inline-flex min-h-9 items-center rounded-control border border-green px-3 text-green">
              Export pro účetní
            </a>
            {!closed && (
              <form action={recomputeMonth}>
                <input type="hidden" name="month" value={month} />
                <Button type="submit" variant="secondary" className="min-h-9">
                  {rows.length ? "Přepočítat z docházky" : "Načíst z docházky"}
                </Button>
              </form>
            )}
            {rows.length > 0 && (
              <ConfirmButton
                action={closeMonth}
                fields={closed ? { month, reopen: "1" } : { month }}
                title={closed ? `Znovu otevřít ${monthLabel(month)}` : `Uzavřít ${monthLabel(month)}`}
                text={closed ? "Podklady půjdou znovu měnit. Výdaje za mzdy se vynulují a doplní při novém uzavření." : `Podklady se zmrazí, zaměstnanci uvidí své pásky a do výdajů se zapíší hrubé mzdy ${formatPrice(sum("gross_czk"))} a odvody ${formatPrice(sum("er_levies_czk"))}.`}
                confirmLabel={closed ? "Otevřít" : "Uzavřít měsíc"}
                variant={closed ? "ghost" : "primary"}
                className="min-h-9"
              >
                {closed ? "Znovu otevřít" : "Uzavřít měsíc"}
              </ConfirmButton>
            )}
          </>
        }
        badges={closed ? <span className="text-small font-semibold rounded-control bg-green px-2 py-0.5 text-cream">uzavřeno {pm?.closed_at ? formatDate(pm.closed_at) : ""}</span> : pm ? <span className="text-small font-semibold rounded-control border border-line bg-white px-2 py-0.5 text-muted">otevřený měsíc</span> : null}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Pills
          items={[
            { href: `/admin/mzdy?mesic=${shiftMonth(month, -1)}`, label: "‹", on: false },
            { href: `/admin/mzdy?mesic=${month}`, label: monthLabel(month), on: true },
            ...(month < current ? [{ href: `/admin/mzdy?mesic=${shiftMonth(month, 1)}`, label: "›", on: false }] : []),
            ...((months ?? []) as { month: string; status: string }[]).filter((x) => x.month !== month).slice(0, 4).map((x) => ({ href: `/admin/mzdy?mesic=${x.month}`, label: `${monthLabel(x.month)}${x.status === "uzavreny" ? " ✓" : ""}`, on: false })),
          ]}
        />
      </div>
      {warnings.size > 0 && (
        <ul className="mt-3 space-y-1 rounded-card border border-brick bg-paper px-4 py-3 text-sm text-brick-text">
          {[...warnings].map((w) => (
            <li key={w}>{w}</li>
          ))}
          <li className="text-muted">
            Parametry upravíte v{" "}
            <Link href={`/admin/mzdy/parametry?rok=${month.slice(0, 4)}`} className="text-brick-text underline">
              Parametrech mezd
            </Link>
            , sazby na kartě zaměstnance.
          </li>
        </ul>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Lidí" value={rows.length} sub={`${sum("hours_work").toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} odpracovaných hodin`} small />
        <Stat label="Hrubé mzdy" value={formatPrice(sum("gross_czk"))} small />
        <Stat label="K výplatě (čisté)" value={formatPrice(sum("net_czk"))} sub={`daň a odvody zaměstnanců ${formatPrice(sum("tax_czk") + sum("emp_levies_czk"))}`} small />
        <Stat label="Náklady celkem" value={formatPrice(sum("employer_cost_czk"))} sub={`z toho odvody zaměstnavatele ${formatPrice(sum("er_levies_czk"))}`} small />
      </div>

      <div className="mt-4">
        {rows.length === 0 ? (
          <p className="text-muted">
            Zatím žádné podklady. Klikněte na „Načíst z docházky“: vezmou se hodiny ze směn a docházky za {monthLabel(month)} a sazby z karet zaměstnanců.
          </p>
        ) : (
          <Table head={["Zaměstnanec", "Hodiny", "Sazba", "Hrubá", "Odvody a daň", "Čistá", "Náklad", "Odměna / srážka / poznámka", ""]}>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>
                  <Link href={`/admin/zamestnanci/${r.employee_id}?karta=dochazka&mesic=${month}`} className="font-semibold text-brick-text hover:underline">
                    {r.employee_name}
                  </Link>
                  <div className="text-small text-muted">{CONTRACT_LABEL[r.contract_type]}</div>
                </Td>
                <Td className="whitespace-nowrap">
                  {Number(r.hours_work).toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} h
                  {(Number(r.hours_vacation) > 0 || Number(r.hours_sick) > 0 || Number(r.hours_holiday) > 0) && (
                    <div className="text-small text-muted">{[Number(r.hours_vacation) > 0 && `dov. ${r.hours_vacation}`, Number(r.hours_sick) > 0 && `nemoc ${r.hours_sick}`, Number(r.hours_holiday) > 0 && `svátek ${r.hours_holiday}`].filter(Boolean).join(", ")}</div>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-muted">{r.monthly_salary_czk ? `${Number(r.monthly_salary_czk).toLocaleString("cs-CZ")} Kč/měs.` : r.hourly_rate_czk ? `${Number(r.hourly_rate_czk).toLocaleString("cs-CZ")} Kč/h` : "—"}</Td>
                <Td className="whitespace-nowrap text-right">{formatPrice(Number(r.gross_czk))}</Td>
                <Td className="whitespace-nowrap text-right text-muted">−{formatPrice(Number(r.emp_levies_czk) + Number(r.tax_czk))}</Td>
                <Td className="whitespace-nowrap text-right font-semibold">{formatPrice(Number(r.net_czk))}</Td>
                <Td className="whitespace-nowrap text-right text-muted">{formatPrice(Number(r.employer_cost_czk))}</Td>
                <Td>
                  {closed ? (
                    <span className="text-sm text-muted">{[Number(r.bonus_czk) > 0 && `+${r.bonus_czk}`, Number(r.deduction_czk) > 0 && `−${r.deduction_czk}`, r.note].filter(Boolean).join(" · ") || "—"}</span>
                  ) : (
                    <form action={savePayrollItem} className="flex flex-wrap items-center gap-1">
                      <input type="hidden" name="id" value={r.id} />
                      <input name="bonus_czk" type="number" min={0} step="1" defaultValue={Number(r.bonus_czk) || ""} placeholder="+ odměna" aria-label="Odměna" className="min-h-8 w-24 py-0.5 text-sm" />
                      <input name="deduction_czk" type="number" min={0} step="1" defaultValue={Number(r.deduction_czk) || ""} placeholder="− srážka" aria-label="Srážka" className="min-h-8 w-24 py-0.5 text-sm" />
                      <input name="note" defaultValue={r.note} placeholder="poznámka" aria-label="Poznámka" className="min-h-8 w-32 py-0.5 text-sm" />
                      <button type="submit" className="text-button min-h-8 rounded-control border border-line px-2 text-green hover:border-green">
                        Uložit
                      </button>
                    </form>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-right">
                  <Link href={`/admin/mzdy/paska/${r.id}`} className="text-sm text-brick-text hover:underline">
                    páska
                  </Link>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
      <p className="mt-3 text-small text-muted">
        Výpočet je orientační: dovolená a svátek sazbou, nemoc 60 % sazby, daň {p ? p.tax_rate_pct : 15} % bez progrese, u DPP a DPČ odvody až od rozhodné částky. Hodiny se berou z docházky, tam je i opravíte (po přepočtu se promítnou).
      </p>
    </>
  );
}
