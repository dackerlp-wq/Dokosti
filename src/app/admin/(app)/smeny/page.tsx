import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Stat } from "@/components/admin/stat";
import { Table, Td } from "@/components/admin/table";
import { buttonClass } from "@/components/ui/button";
import { formatDate } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import type { ShiftRow } from "@/lib/pos";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Směny a uzávěrky" };

/** Historie směn v kase: tržby podle platby, očekávaná a napočítaná hotovost, rozdíly, vzkazy. */
export default async function ShiftsPage({ searchParams }: { searchParams: Promise<{ mesic?: string }> }) {
  const admin = await requireAdmin();
  const { mesic } = await searchParams;
  const month = mesic && /^\d{4}-\d{2}$/.test(mesic) ? mesic : new Date().toISOString().slice(0, 7);
  const db = await getAuthSupabase();
  const [{ data: shifts }, { data: admins }] = await Promise.all([
    db.from("pos_shifts").select("*").gte("opened_at", `${month}-01T00:00:00`).lte("opened_at", `${month}-31T23:59:59`).order("opened_at", { ascending: false }),
    db.from("admins").select("user_id, name"),
  ]);
  const rows = (shifts ?? []) as ShiftRow[];
  const names = new Map(((admins ?? []) as { user_id: string; name: string }[]).map((a) => [a.user_id, a.name]));
  const closed = rows.filter((s) => s.closed_at);
  const sum = (f: (s: ShiftRow) => number) => closed.reduce((n, s) => n + f(s), 0);
  const diff = (s: ShiftRow) => (s.closing_cash_czk ?? 0) - (s.expected_cash_czk ?? 0);
  const prev = new Date(`${month}-01T12:00:00`);
  prev.setMonth(prev.getMonth() - 1);
  const next = new Date(`${month}-01T12:00:00`);
  next.setMonth(next.getMonth() + 1);
  const monthLabel = new Intl.DateTimeFormat("cs-CZ", { month: "long", year: "numeric" }).format(new Date(`${month}-01T12:00:00`));

  return (
    <>
      <PageHeader title="Směny a uzávěrky" subtitle="Každá směna v kase: kdo, od kdy, tržby hotově, kartou a QR, rozdíl v hotovosti při uzávěrce a vzkaz pro další směnu." actions={admin.isManager ? <a href={`/admin/export/smeny.csv?mesic=${month}`} className={buttonClass("secondary")}>Export pro účetní (CSV)</a> : null} />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={`/admin/smeny?mesic=${prev.toISOString().slice(0, 7)}`} className="label text-[11px] text-green hover:underline">
          ← předchozí
        </Link>
        <span className="label text-[11px]">{monthLabel}</span>
        <Link href={`/admin/smeny?mesic=${next.toISOString().slice(0, 7)}`} className="label text-[11px] text-green hover:underline">
          další →
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Směn" value={String(rows.length)} sub={rows.some((s) => !s.closed_at) ? "1 otevřená" : "všechny uzavřené"} />
        <Stat label="Tržby kasa" value={formatPrice(sum((s) => s.cash_sales_czk + s.card_sales_czk + s.qr_sales_czk))} sub={`hotově ${formatPrice(sum((s) => s.cash_sales_czk))} · kartou ${formatPrice(sum((s) => s.card_sales_czk))} · QR ${formatPrice(sum((s) => s.qr_sales_czk))}`} />
        <Stat label="Rozdíly v hotovosti" value={formatPrice(sum(diff))} sub={`${closed.filter((s) => diff(s) !== 0).length} směn s rozdílem`} warn={closed.some((s) => diff(s) !== 0)} />
        <Stat label="Storna" value={String(sum((s) => s.cancelled_count))} sub="důvody v deníku změn" />
      </div>
      <div className="mt-4">
        {rows.length === 0 ? (
          <p className="text-muted">V tomto měsíci žádná směna.</p>
        ) : (
          <Table head={["Směna", "Kdo", "Účtenek", "Hotově", "Kartou", "QR", "Očekáváno", "Napočítáno", "Rozdíl", "Vzkaz"]}>
            {rows.map((s) => {
              const d = diff(s);
              return (
                <tr key={s.id}>
                  <Td className="whitespace-nowrap">
                    {formatDate(s.opened_at)}
                    <span className="block text-xs text-muted">{s.closed_at ? `do ${new Date(s.closed_at).toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" })}` : "otevřená"}</span>
                  </Td>
                  <Td>{names.get((s as ShiftRow & { opened_by?: string }).opened_by ?? "") || "—"}</Td>
                  <Td>{s.sales_count}</Td>
                  <Td className="whitespace-nowrap">{formatPrice(s.cash_sales_czk)}</Td>
                  <Td className="whitespace-nowrap">{formatPrice(s.card_sales_czk)}</Td>
                  <Td className="whitespace-nowrap">{formatPrice(s.qr_sales_czk)}</Td>
                  <Td className="whitespace-nowrap">{s.expected_cash_czk !== null ? formatPrice(s.expected_cash_czk) : "—"}</Td>
                  <Td className="whitespace-nowrap">{s.closing_cash_czk !== null ? formatPrice(s.closing_cash_czk) : "—"}</Td>
                  <Td className={`whitespace-nowrap ${s.closed_at && d !== 0 ? "font-semibold text-brick-text" : ""}`}>{s.closed_at ? formatPrice(d) : "—"}</Td>
                  <Td className="text-muted">{s.note}</Td>
                </tr>
              );
            })}
          </Table>
        )}
      </div>
    </>
  );
}
