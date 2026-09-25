import type { Metadata } from "next";
import Link from "next/link";
import { Table, Td } from "@/components/admin/table";
import { formatDay } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Statistiky" };

type DayRow = { day: string; orders: number; revenue_czk: number; odber: number; rozvoz: number; prepravce: number };
type ProductRow = { product_slug: string; name: string; qty: number; revenue_czk: number; last_sold_at: string };

const PERIODS = [
  { id: "30", label: "30 dní", days: 30 },
  { id: "90", label: "90 dní", days: 90 },
  { id: "365", label: "Rok", days: 365 },
] as const;

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ obdobi?: string }> }) {
  const { obdobi } = await searchParams;
  const period = PERIODS.find((p) => p.id === obdobi) ?? PERIODS[0];
  const from = new Date();
  from.setDate(from.getDate() - period.days);
  const fromIso = from.toISOString().slice(0, 10);

  const db = await getAuthSupabase();
  const [{ data: days }, { data: products }, { data: recentItems }] = await Promise.all([
    db.from("sales_by_day").select("*").gte("day", fromIso).order("day", { ascending: false }),
    db.from("top_products").select("*").order("qty", { ascending: false }).limit(15),
    db
      .from("order_items")
      .select("product_slug, name, qty, unit_price_czk, orders!inner(created_at, status)")
      .gte("orders.created_at", from.toISOString())
      .neq("orders.status", "zrusena"),
  ]);

  const rows = (days ?? []) as DayRow[];
  const orders = rows.reduce((n, r) => n + Number(r.orders), 0);
  const revenue = rows.reduce((n, r) => n + Number(r.revenue_czk), 0);
  const byMethod = {
    odber: rows.reduce((n, r) => n + Number(r.odber), 0),
    rozvoz: rows.reduce((n, r) => n + Number(r.rozvoz), 0),
    prepravce: rows.reduce((n, r) => n + Number(r.prepravce), 0),
  };

  // Top produkty za zvolené období (view top_products je za celou historii).
  const periodTop = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const i of (recentItems ?? []) as { product_slug: string; name: string; qty: number; unit_price_czk: number }[]) {
    const cur = periodTop.get(i.product_slug) ?? { name: i.name, qty: 0, revenue: 0 };
    cur.qty += i.qty;
    cur.revenue += i.qty * i.unit_price_czk;
    periodTop.set(i.product_slug, cur);
  }
  const top = [...periodTop.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 10);
  const allTime = (products ?? []) as ProductRow[];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>Statistiky</h1>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <Link
              key={p.id}
              href={`/admin/statistiky?obdobi=${p.id}`}
              className={`label inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] ${
                p.id === period.id ? "border-green bg-green text-cream" : "border-line bg-paper text-green hover:border-green"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Tržby" value={formatPrice(revenue)} />
        <Stat label="Objednávek" value={String(orders)} />
        <Stat label="Průměrná objednávka" value={orders ? formatPrice(Math.round(revenue / orders)) : "—"} />
        <Stat label="Odběr / rozvoz / přepravce" value={`${byMethod.odber} / ${byMethod.rozvoz} / ${byMethod.prepravce}`} />
      </div>

      <p className="mt-3 text-sm text-muted">
        Zrušené objednávky se nepočítají.{" "}
        <a href={`/admin/export/objednavky.csv?od=${fromIso}`} className="text-green underline">
          Stáhnout objednávky za období (CSV pro účetní)
        </a>
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-[20px]">Nejprodávanější za období</h2>
          {top.length === 0 ? (
            <p className="text-muted">Zatím žádné prodeje.</p>
          ) : (
            <Table head={["Produkt", "Kusů", "Tržba"]}>
              {top.map(([slug, t]) => (
                <tr key={slug}>
                  <Td>{t.name}</Td>
                  <Td>{t.qty}</Td>
                  <Td>{formatPrice(t.revenue)}</Td>
                </tr>
              ))}
            </Table>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-[20px]">Tržby po dnech</h2>
          {rows.length === 0 ? (
            <p className="text-muted">Zatím žádné objednávky.</p>
          ) : (
            <Table head={["Den", "Objednávek", "Tržba"]}>
              {rows.map((r) => (
                <tr key={r.day}>
                  <Td>{formatDay(r.day)}</Td>
                  <Td>{r.orders}</Td>
                  <Td>{formatPrice(Number(r.revenue_czk))}</Td>
                </tr>
              ))}
            </Table>
          )}
        </section>
      </div>

      {allTime.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-[20px]">Nejprodávanější celkově</h2>
          <Table head={["Produkt", "Kusů", "Tržba", "Naposledy"]}>
            {allTime.map((p) => (
              <tr key={p.product_slug}>
                <Td>{p.name}</Td>
                <Td>{p.qty}</Td>
                <Td>{formatPrice(Number(p.revenue_czk))}</Td>
                <Td>{formatDay(p.last_sold_at.slice(0, 10))}</Td>
              </tr>
            ))}
          </Table>
        </section>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
      <p className="label text-[11px] text-muted">{label}</p>
      <p className="font-display text-[24px] font-semibold">{value}</p>
    </div>
  );
}
