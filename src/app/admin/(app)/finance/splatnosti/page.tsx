import type { Metadata } from "next";
import Link from "next/link";
import { markExpensePaid } from "@/app/admin/(app)/finance/actions";
import { PageHeader } from "@/components/admin/page-header";
import { Stat } from "@/components/admin/stat";
import { Table, Td } from "@/components/admin/table";
import { EXPENSE_CATEGORY_LABEL, formatDay, monthLabel, PAYMENT_LABEL, type ExpenseRow, type OrderRow, type RecurringExpenseRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Peníze a splatnosti" };

/** Co máme zaplatit, co nám dluží, co je v kase, co přijde. Jedna obrazovka na „kolik máme peněz“. */
export default async function CashPage() {
  await requireManager();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const in30 = new Date(now.getTime() + 30 * 86_400_000).toISOString().slice(0, 10);
  const db = await getAuthSupabase();
  const [{ data: unpaid }, { data: owed }, { data: shift }, { data: lastShift }, { data: recurring }, { data: openPayroll }] = await Promise.all([
    db.from("expenses").select("*").is("paid_at", null).order("due_on", { ascending: true, nullsFirst: false }),
    db.from("orders").select("*").is("paid_at", null).in("status", ["nova", "potvrzena", "pripravena", "doruceno"]).order("created_at"),
    db.from("pos_shifts").select("*").is("closed_at", null).order("opened_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("pos_shifts").select("closing_cash_czk, closed_at").not("closed_at", "is", null).order("closed_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("recurring_expenses").select("*").eq("active", true).order("day_of_month"),
    db.from("payroll_items").select("month, employer_cost_czk, payroll_months!inner(status)").eq("payroll_months.status", "otevreny"),
  ]);
  const toPay = (unpaid ?? []) as ExpenseRow[];
  const debtors = (owed ?? []) as OrderRow[];
  const rec = (recurring ?? []) as RecurringExpenseRow[];
  const sum = (xs: number[]) => xs.reduce((n, v) => n + v, 0);
  const overdue = toPay.filter((e) => e.due_on && e.due_on < today);
  const soon = toPay.filter((e) => !e.due_on || (e.due_on >= today && e.due_on <= in30));
  const later = toPay.filter((e) => e.due_on && e.due_on > in30);
  const shiftRow = shift as { opened_at: string; opening_cash_czk: number; cash_sales_czk: number } | null;
  const lastRow = lastShift as { closing_cash_czk: number | null; closed_at: string } | null;
  const cashInRegister = shiftRow ? shiftRow.opening_cash_czk + shiftRow.cash_sales_czk : (lastRow?.closing_cash_czk ?? 0);
  const expectedRecurring = rec.filter((r) => r.last_generated_month !== month && r.day_of_month > Number(today.slice(8, 10)));
  const openPayrollCost = sum(((openPayroll ?? []) as { employer_cost_czk: number }[]).map((i) => Number(i.employer_cost_czk)));
  const payrollMonths = [...new Set(((openPayroll ?? []) as { month: string }[]).map((i) => i.month))];


  return (
    <>
      <PageHeader title="Peníze a splatnosti" subtitle="Co je potřeba zaplatit a kdy, kdo dluží nám, kolik je v kase. Zaplacení odškrtněte tady nebo u příjemky, propíše se všude." />
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Po splatnosti" value={formatPrice(sum(overdue.map((e) => Number(e.amount_czk))))} warn={overdue.length > 0} sub={`${overdue.length} položek`} small />
        <Stat label="K zaplacení do 30 dní" value={formatPrice(sum(soon.map((e) => Number(e.amount_czk))))} sub={`${soon.length} položek`} small />
        <Stat label="Zákazníci dluží" value={formatPrice(sum(debtors.map((o) => o.total_czk)))} sub={`${debtors.length} objednávek`} href="/admin/objednavky?pohled=neplaceno" small />
        <Stat label={shiftRow ? "V kase teď (odhad)" : "V kase po poslední uzávěrce"} value={formatPrice(cashInRegister)} sub={shiftRow ? `směna od ${formatDay(shiftRow.opened_at.slice(0, 10))}` : lastRow ? formatDay(lastRow.closed_at.slice(0, 10)) : "zatím žádná směna"} href="/admin/smeny" small />
      </div>

      {overdue.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-[20px] text-brick-text">Po splatnosti</h2>
          <ExpenseRows list={overdue} today={today} />
        </section>
      )}
      <section className="mt-6">
        <h2 className="mb-2 text-[20px]">K zaplacení do 30 dní</h2>
        {soon.length === 0 ? <p className="text-muted">Nic. Všechno je zaplacené.</p> : <ExpenseRows list={soon} today={today} />}
      </section>
      {later.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-[20px]">Později</h2>
          <ExpenseRows list={later} today={today} />
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-[20px]">Co ještě přijde</h2>
        <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-white text-sm">
          {expectedRecurring.map((r) => (
            <li key={r.id} className="flex justify-between px-4 py-2">
              <span>
                {r.name} <span className="text-muted">· {r.day_of_month}. {monthLabel(month).split(" ")[0]}</span>
              </span>
              <span>{formatPrice(Number(r.amount_czk))}</span>
            </li>
          ))}
          {payrollMonths.map((m) => (
            <li key={m} className="flex justify-between px-4 py-2">
              <span>
                <Link href={`/admin/mzdy?mesic=${m}`} className="text-green hover:underline">
                  Mzdy a odvody {monthLabel(m)}
                </Link>{" "}
                <span className="text-muted">· zatím otevřený měsíc, odhad</span>
              </span>
              <span>{formatPrice(openPayrollCost)}</span>
            </li>
          ))}
          {expectedRecurring.length === 0 && payrollMonths.length === 0 && <li className="px-4 py-2 text-muted">Nic dalšího tento měsíc neznáme.</li>}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-[20px]">Zákazníci dluží</h2>
        {debtors.length === 0 ? (
          <p className="text-muted">Nikdo nic nedluží.</p>
        ) : (
          <Table head={["Objednávka", "Zákazník", "Platba", "Stav", "Částka"]}>
            {debtors.map((o) => (
              <tr key={o.id}>
                <Td>
                  <Link href={`/admin/objednavky/${o.id}`} className="font-semibold text-green hover:underline">
                    {o.order_number}
                  </Link>
                  <div className="text-xs text-muted">{formatDay(o.created_at.slice(0, 10))}</div>
                </Td>
                <Td>{o.customer_name}</Td>
                <Td>{PAYMENT_LABEL[o.payment_method]}</Td>
                <Td className="text-muted">{o.status}</Td>
                <Td className="text-right font-semibold">{formatPrice(o.total_czk)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </>
  );
}

function ExpenseRows({ list, today }: { list: ExpenseRow[]; today: string }) {
  return (
    <Table head={["Splatnost", "Co", "Kategorie", "Částka", ""]}>
      {list.map((e) => (
        <tr key={e.id}>
          <Td className={`whitespace-nowrap ${e.due_on && e.due_on < today ? "font-semibold text-brick-text" : ""}`}>{e.due_on ? formatDay(e.due_on) : <span className="text-muted">bez termínu</span>}</Td>
          <Td>
            <span className="font-semibold">{e.description}</span>
            {(e.supplier || e.document_no) && <div className="text-xs text-muted">{[e.supplier, e.document_no].filter(Boolean).join(" · ")}</div>}
          </Td>
          <Td>{EXPENSE_CATEGORY_LABEL[e.category]}</Td>
          <Td className="whitespace-nowrap text-right font-semibold">{formatPrice(Number(e.amount_czk))}</Td>
          <Td className="text-right">
            <form action={markExpensePaid} className="inline">
              <input type="hidden" name="id" value={e.id} />
              <button type="submit" className="text-sm text-green hover:underline">
                zaplaceno
              </button>
            </form>
          </Td>
        </tr>
      ))}
    </Table>
  );
}
