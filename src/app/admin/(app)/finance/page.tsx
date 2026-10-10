import type { Metadata } from "next";
import Link from "next/link";
import { FinanceChart, type FinanceBar } from "@/components/admin/finance-chart";
import { PageHeader } from "@/components/admin/page-header";
import { Pills, Stat } from "@/components/admin/stat";
import { Table, Td } from "@/components/admin/table";
import { EXPENSE_CATEGORY_LABEL, isMonth, monthLabel, shiftMonth, type ExpenseCategory, type FinanceMonthRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Finance" };

/** Od obratu k zisku: tržby kasa + web, náklady na prodané zboží, odpisy, výdaje po kategoriích. Měsíc a rok. */
export default async function FinancePage({ searchParams }: { searchParams: Promise<{ mesic?: string }> }) {
  await requireManager();
  const sp = await searchParams;
  const current = new Date().toISOString().slice(0, 7);
  const month = isMonth(sp.mesic) ? sp.mesic : current;
  const year = month.slice(0, 4);
  const db = await getAuthSupabase();
  const [{ data: rows }, { data: unpaidExp }, { data: unpaidOrders }, { data: stockValue }] = await Promise.all([
    db.from("finance_months").select("*").gte("month", shiftMonth(current, -11)).order("month"),
    db.from("expenses").select("amount_czk").is("paid_at", null),
    db.from("orders").select("total_czk").is("paid_at", null).neq("status", "zrusena"),
    db.from("products").select("stock_qty, purchase_price_czk").not("stock_qty", "is", null),
  ]);
  const months = (rows ?? []) as FinanceMonthRow[];
  const byMonth = new Map(months.map((m) => [m.month, m]));
  const empty = (m: string): FinanceMonthRow => ({ month: m, pos_revenue_czk: 0, pos_count: 0, pos_cost_czk: 0, web_revenue_czk: 0, web_count: 0, web_cost_czk: 0, web_unpaid_czk: 0, writeoff_czk: 0, internal_czk: 0, expenses: {}, expenses_czk: 0, expenses_paid_czk: 0 });
  const num = (v: unknown) => Number(v ?? 0);
  const calc = (m: FinanceMonthRow) => {
    const revenue = num(m.pos_revenue_czk) + num(m.web_revenue_czk);
    const cogs = num(m.pos_cost_czk) + num(m.web_cost_czk);
    const writeoff = num(m.writeoff_czk) + num(m.internal_czk);
    const other = Object.entries(m.expenses ?? {}).filter(([k]) => k !== "zbozi").reduce((n, [, v]) => n + num(v), 0);
    const goodsBought = num(m.expenses?.zbozi);
    const profit = revenue - cogs - writeoff - other;
    return { revenue, cogs, writeoff, other, goodsBought, profit, margin: revenue - cogs, cash: revenue - num(m.web_unpaid_czk) - num(m.expenses_paid_czk) };
  };
  const m = byMonth.get(month) ?? empty(month);
  const c = calc(m);
  const yearRows = months.filter((r) => r.month.startsWith(year) && r.month <= month);
  const y = yearRows.map(calc).reduce((a, b) => ({ revenue: a.revenue + b.revenue, cogs: a.cogs + b.cogs, writeoff: a.writeoff + b.writeoff, other: a.other + b.other, goodsBought: a.goodsBought + b.goodsBought, profit: a.profit + b.profit, margin: a.margin + b.margin, cash: a.cash + b.cash }), { revenue: 0, cogs: 0, writeoff: 0, other: 0, goodsBought: 0, profit: 0, margin: 0, cash: 0 });
  const bars: FinanceBar[] = [];
  for (let i = 11; i >= 0; i--) {
    const mm = shiftMonth(current, -i);
    const r = calc(byMonth.get(mm) ?? empty(mm));
    bars.push({ month: mm, label: new Intl.DateTimeFormat("cs-CZ", { month: "short" }).format(new Date(`${mm}-01T12:00:00`)).replace(".", ""), revenue: r.revenue, costs: r.cogs + r.writeoff + r.other, profit: r.profit, current: mm === month });
  }
  const unpaidExpenses = (unpaidExp ?? []).reduce((n, e) => n + num(e.amount_czk), 0);
  const receivables = (unpaidOrders ?? []).reduce((n, o) => n + num(o.total_czk), 0);
  const stock = (stockValue ?? []).reduce((n, p) => n + num(p.stock_qty) * num(p.purchase_price_czk), 0);
  const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)} %` : "—");
  const cats = (Object.keys(EXPENSE_CATEGORY_LABEL) as ExpenseCategory[]).filter((k) => k !== "zbozi");

  return (
    <>
      <PageHeader
        title="Finance"
        subtitle="Od obratu k zisku. Tržby z kasy a webu, náklady na prodané zboží z nákupních cen, odpisy a všechny výdaje. Orientační přehled pro vás, účetní má své."
        actions={
          <Link href="/admin/finance/splatnosti" className="label inline-flex min-h-9 items-center rounded-[var(--radius-control)] border border-green px-3 text-[11px] text-green">
            Peníze a splatnosti
          </Link>
        }
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Pills
          items={[
            { href: `/admin/finance?mesic=${shiftMonth(month, -1)}`, label: "‹ předchozí", on: false },
            { href: `/admin/finance?mesic=${month}`, label: monthLabel(month), on: true },
            ...(month < current ? [{ href: `/admin/finance?mesic=${shiftMonth(month, 1)}`, label: "další ›", on: false }] : []),
            ...(month !== current ? [{ href: "/admin/finance", label: "Tento měsíc", on: false }] : []),
          ]}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={`Obrat · ${monthLabel(month)}`} value={formatPrice(c.revenue)} sub={`kasa ${formatPrice(num(m.pos_revenue_czk))} · web ${formatPrice(num(m.web_revenue_czk))}`} />
        <Stat label="Hrubá marže" value={formatPrice(c.margin)} sub={`${pct(c.margin, c.revenue)} z obratu, zboží za ${formatPrice(c.cogs)}`} />
        <Stat label="Výsledek měsíce" value={formatPrice(c.profit)} warn={c.profit < 0} sub={c.revenue > 0 ? `${pct(c.profit, c.revenue)} z obratu` : "bez tržeb"} />
        <Stat label={`Rok ${year} do konce měsíce`} value={formatPrice(y.profit)} warn={y.profit < 0} sub={`obrat ${formatPrice(y.revenue)}, marže ${pct(y.margin, y.revenue)}`} />
      </div>

      <section className="mt-6 rounded-[var(--radius-card)] border border-line bg-paper p-4">
        <h2 className="mb-2 text-[18px]">Posledních 12 měsíců</h2>
        <FinanceChart bars={bars} />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-[20px]">Od obratu k zisku · {monthLabel(month)}</h2>
          <Table head={["Položka", "Kč", "% obratu"]}>
            <tr>
              <Td>Tržby kasa ({num(m.pos_count)} prodejů)</Td>
              <Td className="text-right">{formatPrice(num(m.pos_revenue_czk))}</Td>
              <Td className="text-right text-muted">{pct(num(m.pos_revenue_czk), c.revenue)}</Td>
            </tr>
            <tr>
              <Td>Tržby web ({num(m.web_count)} objednávek)</Td>
              <Td className="text-right">{formatPrice(num(m.web_revenue_czk))}</Td>
              <Td className="text-right text-muted">{pct(num(m.web_revenue_czk), c.revenue)}</Td>
            </tr>
            <tr className="font-semibold">
              <Td>Obrat</Td>
              <Td className="text-right">{formatPrice(c.revenue)}</Td>
              <Td className="text-right text-muted">100 %</Td>
            </tr>
            <tr>
              <Td>− Nákupní cena prodaného zboží</Td>
              <Td className="text-right text-brick-text">−{formatPrice(c.cogs)}</Td>
              <Td className="text-right text-muted">{pct(c.cogs, c.revenue)}</Td>
            </tr>
            <tr className="font-semibold">
              <Td>Hrubá marže</Td>
              <Td className="text-right">{formatPrice(c.margin)}</Td>
              <Td className="text-right text-muted">{pct(c.margin, c.revenue)}</Td>
            </tr>
            <tr>
              <Td>− Odpisy a interní výdej (v nákupních cenách)</Td>
              <Td className="text-right text-brick-text">−{formatPrice(c.writeoff)}</Td>
              <Td className="text-right text-muted">{pct(c.writeoff, c.revenue)}</Td>
            </tr>
            {cats.map((k) => {
              const v = num(m.expenses?.[k]);
              if (!v) return null;
              return (
                <tr key={k}>
                  <Td>− {EXPENSE_CATEGORY_LABEL[k]}</Td>
                  <Td className="text-right text-brick-text">−{formatPrice(v)}</Td>
                  <Td className="text-right text-muted">{pct(v, c.revenue)}</Td>
                </tr>
              );
            })}
            <tr className="font-semibold">
              <Td>Výsledek měsíce</Td>
              <Td className={`text-right ${c.profit < 0 ? "text-brick-text" : "text-green"}`}>{formatPrice(c.profit)}</Td>
              <Td className="text-right text-muted">{pct(c.profit, c.revenue)}</Td>
            </tr>
          </Table>
          <p className="mt-2 text-xs text-muted">
            Zboží nakoupené tento měsíc (příjemky): {formatPrice(c.goodsBought)}. Do výsledku jde až prodané zboží v nákupní ceně, zbytek leží na skladě. Mzdy se objeví po uzavření měsíce v{" "}
            <Link href={`/admin/mzdy?mesic=${month}`} className="text-green underline">
              Mzdách
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-[20px]">Peníze</h2>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Nezaplacené výdaje" value={formatPrice(unpaidExpenses)} warn={unpaidExpenses > 0} href="/admin/finance/splatnosti" small />
            <Stat label="Zákazníci dluží (web)" value={formatPrice(receivables)} href="/admin/objednavky?pohled=neplaceno" small />
            <Stat label="Zboží na skladě (nákupní ceny)" value={formatPrice(stock)} href="/admin/sklad" small />
            <Stat label={`Tok peněz · ${monthLabel(month)}`} value={formatPrice(c.cash)} sub="přijaté tržby minus zaplacené výdaje" small />
          </div>
          <h3 className="mt-6 mb-2 text-[16px]">Rok {year} po měsících</h3>
          <Table head={["Měsíc", "Obrat", "Marže", "Výdaje", "Výsledek"]}>
            {yearRows.length === 0 ? (
              <tr>
                <Td className="text-muted">Zatím nic.</Td>
                <Td>{""}</Td>
                <Td>{""}</Td>
                <Td>{""}</Td>
                <Td>{""}</Td>
              </tr>
            ) : (
              [...yearRows].reverse().map((r) => {
                const k = calc(r);
                return (
                  <tr key={r.month} className={r.month === month ? "font-semibold" : ""}>
                    <Td>
                      <Link href={`/admin/finance?mesic=${r.month}`} className="text-green hover:underline">
                        {monthLabel(r.month)}
                      </Link>
                    </Td>
                    <Td className="text-right">{formatPrice(k.revenue)}</Td>
                    <Td className="text-right">{pct(k.margin, k.revenue)}</Td>
                    <Td className="text-right">{formatPrice(k.writeoff + k.other)}</Td>
                    <Td className={`text-right ${k.profit < 0 ? "text-brick-text" : ""}`}>{formatPrice(k.profit)}</Td>
                  </tr>
                );
              })
            )}
          </Table>
        </section>
      </div>
    </>
  );
}
