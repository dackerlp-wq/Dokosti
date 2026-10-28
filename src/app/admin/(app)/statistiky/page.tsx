import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { Pills, Stat } from "@/components/admin/stat";
import { Table, Td } from "@/components/admin/table";
import { formatDay } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Statistiky" };

type WebDay = { day: string; orders: number; revenue_czk: number; odber: number; rozvoz: number; prepravce: number; cost_czk: number };
type PosDay = { day: string; sales: number; revenue_czk: number; cost_czk: number };
type TopRow = { product_slug: string; name: string; qty: number; revenue_czk: number; cost_czk: number; last_sold_at: string };
type Item = { product_slug: string; name: string; qty: number; revenue: number; cost: number };

const PERIODS = [
  { id: "30", label: "30 dní", days: 30 },
  { id: "90", label: "90 dní", days: 90 },
  { id: "365", label: "Rok", days: 365 },
] as const;

const CHANNELS = [
  { id: "vse", label: "E-shop i prodejna" },
  { id: "web", label: "E-shop" },
  { id: "kasa", label: "Prodejna" },
] as const;
type Channel = (typeof CHANNELS)[number]["id"];

const n = (v: unknown) => Number(v ?? 0);
const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)} %` : "—");

/** Prodeje e-shopu a kasy vedle sebe. Hrubý zisk z nákupních cen uložených na položce v okamžiku prodeje. */
export default async function StatsPage({ searchParams }: { searchParams: Promise<{ obdobi?: string; kanal?: string }> }) {
  await requireManager();
  const { obdobi, kanal } = await searchParams;
  const period = PERIODS.find((p) => p.id === obdobi) ?? PERIODS[0];
  const channel: Channel = CHANNELS.find((c) => c.id === kanal)?.id ?? "vse";
  const from = new Date();
  from.setDate(from.getDate() - period.days);
  const fromIso = from.toISOString().slice(0, 10);

  const db = await getAuthSupabase();
  const [{ data: webDays }, { data: posDays }, { data: webTop }, { data: posTop }, { data: webItems }, { data: posItems }] = await Promise.all([
    db.from("sales_by_day").select("*").gte("day", fromIso).order("day", { ascending: false }),
    db.from("pos_sales_by_day").select("*").gte("day", fromIso).order("day", { ascending: false }),
    db.from("top_products").select("*").order("qty", { ascending: false }).limit(30),
    db.from("pos_top_products").select("*").order("qty", { ascending: false }).limit(30),
    db
      .from("order_items")
      .select("product_slug, name, qty, unit_price_czk, unit_cost_czk, orders!inner(created_at, status)")
      .gte("orders.created_at", from.toISOString())
      .neq("orders.status", "zrusena"),
    db
      .from("pos_sale_items")
      .select("product_slug, name, qty, line_total_czk, unit_cost_czk, pos_sales!inner(created_at, status, order_id)")
      .gte("pos_sales.created_at", from.toISOString())
      .eq("pos_sales.status", "zaplaceno")
      .is("pos_sales.order_id", null),
  ]);

  const web = (webDays ?? []) as WebDay[];
  const pos = (posDays ?? []) as PosDay[];
  const sum = <T,>(rows: T[], f: (r: T) => unknown) => rows.reduce((s, r) => s + n(f(r)), 0);
  const w = { count: sum(web, (r) => r.orders), revenue: sum(web, (r) => r.revenue_czk), cost: sum(web, (r) => r.cost_czk) };
  const k = { count: sum(pos, (r) => r.sales), revenue: sum(pos, (r) => r.revenue_czk), cost: sum(pos, (r) => r.cost_czk) };
  const sel = channel === "web" ? w : channel === "kasa" ? k : { count: w.count + k.count, revenue: w.revenue + k.revenue, cost: w.cost + k.cost };
  const byMethod = { odber: sum(web, (r) => r.odber), rozvoz: sum(web, (r) => r.rozvoz), prepravce: sum(web, (r) => r.prepravce) };

  // Den po dni: e-shop a prodejna v jednom řádku.
  const days = new Map<string, { web: number; webCount: number; pos: number; posCount: number }>();
  for (const r of web) days.set(r.day, { web: n(r.revenue_czk), webCount: n(r.orders), pos: 0, posCount: 0 });
  for (const r of pos) {
    const cur = days.get(r.day) ?? { web: 0, webCount: 0, pos: 0, posCount: 0 };
    days.set(r.day, { ...cur, pos: n(r.revenue_czk), posCount: n(r.sales) });
  }
  const dayRows = [...days.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  // Nejprodávanější za období podle kanálu.
  const merge = (map: Map<string, Item>, it: Item) => {
    const cur = map.get(it.product_slug) ?? { ...it, qty: 0, revenue: 0, cost: 0 };
    map.set(it.product_slug, { ...cur, qty: cur.qty + it.qty, revenue: cur.revenue + it.revenue, cost: cur.cost + it.cost });
  };
  const periodTop = new Map<string, Item>();
  if (channel !== "kasa")
    for (const i of (webItems ?? []) as { product_slug: string; name: string; qty: number; unit_price_czk: number; unit_cost_czk: number | null }[])
      merge(periodTop, { product_slug: i.product_slug, name: i.name, qty: n(i.qty), revenue: n(i.qty) * i.unit_price_czk, cost: n(i.qty) * n(i.unit_cost_czk) });
  if (channel !== "web")
    for (const i of (posItems ?? []) as { product_slug: string; name: string; qty: number; line_total_czk: number; unit_cost_czk: number | null }[])
      merge(periodTop, { product_slug: i.product_slug, name: i.name, qty: n(i.qty), revenue: n(i.line_total_czk), cost: n(i.qty) * n(i.unit_cost_czk) });
  const top = [...periodTop.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 15);

  // Celkově (od začátku).
  const allMap = new Map<string, Item & { last: string }>();
  const addAll = (rows: TopRow[]) => {
    for (const r of rows) {
      const cur = allMap.get(r.product_slug) ?? { product_slug: r.product_slug, name: r.name, qty: 0, revenue: 0, cost: 0, last: r.last_sold_at };
      allMap.set(r.product_slug, { ...cur, qty: cur.qty + n(r.qty), revenue: cur.revenue + n(r.revenue_czk), cost: cur.cost + n(r.cost_czk), last: r.last_sold_at > cur.last ? r.last_sold_at : cur.last });
    }
  };
  if (channel !== "kasa") addAll((webTop ?? []) as TopRow[]);
  if (channel !== "web") addAll((posTop ?? []) as TopRow[]);
  const allTime = [...allMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 15);

  const href = (o: { obdobi?: string; kanal?: string }) => {
    const q = new URLSearchParams({ obdobi: o.obdobi ?? period.id, kanal: o.kanal ?? channel });
    return `/admin/statistiky?${q}`;
  };
  const profit = (rev: number, cost: number) => (cost > 0 ? `${formatPrice(Math.round(rev - cost))} · ${pct(rev - cost, rev)}` : "—");

  return (
    <>
      <PageHeader title="Statistiky" subtitle="Tržby, zisk a nejprodávanější zboží z e-shopu i z kasy v prodejně. Zrušené objednávky a stornované účtenky se nepočítají." />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Pills items={PERIODS.map((p) => ({ href: href({ obdobi: p.id }), label: p.label, on: p.id === period.id }))} />
        <Pills items={CHANNELS.map((c) => ({ href: href({ kanal: c.id }), label: c.label, on: c.id === channel }))} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Tržby" value={formatPrice(sel.revenue)} sub={channel === "vse" ? `e-shop ${formatPrice(w.revenue)} · prodejna ${formatPrice(k.revenue)}` : undefined} />
        <Stat label="Hrubý zisk" value={sel.cost > 0 ? formatPrice(Math.round(sel.revenue - sel.cost)) : "—"} sub={sel.cost > 0 ? `${pct(sel.revenue - sel.cost, sel.revenue)} z tržeb` : undefined} />
        <Stat label={channel === "kasa" ? "Účtenek" : channel === "web" ? "Objednávek" : "Nákupů"} value={String(sel.count)} sub={channel === "vse" ? `e-shop ${w.count} · prodejna ${k.count}` : undefined} />
        <Stat label="Průměrný nákup" value={sel.count ? formatPrice(Math.round(sel.revenue / sel.count)) : "—"} sub={channel !== "kasa" ? `odběr ${byMethod.odber} · rozvoz ${byMethod.rozvoz} · přepravce ${byMethod.prepravce}` : undefined} />
      </div>
      {sel.cost === 0 && sel.revenue > 0 && <p className="mt-2 text-small text-muted">Hrubý zisk se počítá z nákupních cen u produktů. Prodeje bez nákupní ceny ho nezapočítají.</p>}

      {channel === "vse" && (
        <section className="mt-6">
          <h2 className="mb-2 text-[20px]">E-shop a prodejna</h2>
          <Table head={["Kanál", "Tržby", "Nákupů", "Průměr", "Hrubý zisk"]}>
            {[
              { label: "E-shop", ...w },
              { label: "Prodejna", ...k },
            ].map((c) => (
              <tr key={c.label}>
                <Td>{c.label}</Td>
                <Td>{formatPrice(c.revenue)}</Td>
                <Td>{c.count}</Td>
                <Td>{c.count ? formatPrice(Math.round(c.revenue / c.count)) : "—"}</Td>
                <Td>{profit(c.revenue, c.cost)}</Td>
              </tr>
            ))}
          </Table>
        </section>
      )}

      <p className="mt-3 text-sm text-muted">
        <a href={`/admin/export/objednavky.csv?od=${fromIso}`} className="text-brick-text underline">
          Stáhnout objednávky e-shopu za období (CSV pro účetní)
        </a>
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-[20px]">Nejprodávanější za období</h2>
          {top.length === 0 ? (
            <p className="text-muted">Zatím žádné prodeje.</p>
          ) : (
            <Table head={["Produkt", "Množství", "Tržba", "Hrubý zisk"]}>
              {top.map((t) => (
                <tr key={t.product_slug}>
                  <Td>{t.name}</Td>
                  <Td>{t.qty.toLocaleString("cs-CZ", { maximumFractionDigits: 2 })}</Td>
                  <Td>{formatPrice(Math.round(t.revenue))}</Td>
                  <Td>{profit(t.revenue, t.cost)}</Td>
                </tr>
              ))}
            </Table>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-[20px]">Tržby po dnech</h2>
          {dayRows.length === 0 ? (
            <p className="text-muted">Zatím žádné prodeje.</p>
          ) : (
            <Table head={channel === "vse" ? ["Den", "E-shop", "Prodejna", "Celkem"] : ["Den", channel === "kasa" ? "Účtenek" : "Objednávek", "Tržba"]}>
              {dayRows
                .filter(([, d]) => (channel === "web" ? d.webCount > 0 : channel === "kasa" ? d.posCount > 0 : true))
                .map(([day, d]) =>
                  channel === "vse" ? (
                    <tr key={day}>
                      <Td>{formatDay(day)}</Td>
                      <Td>{formatPrice(d.web)}</Td>
                      <Td>{formatPrice(d.pos)}</Td>
                      <Td>{formatPrice(d.web + d.pos)}</Td>
                    </tr>
                  ) : (
                    <tr key={day}>
                      <Td>{formatDay(day)}</Td>
                      <Td>{channel === "kasa" ? d.posCount : d.webCount}</Td>
                      <Td>{formatPrice(channel === "kasa" ? d.pos : d.web)}</Td>
                    </tr>
                  ),
                )}
            </Table>
          )}
        </section>
      </div>

      {allTime.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-[20px]">Nejprodávanější celkově</h2>
          <Table head={["Produkt", "Množství", "Tržba", "Hrubý zisk", "Naposledy"]}>
            {allTime.map((p) => (
              <tr key={p.product_slug}>
                <Td>{p.name}</Td>
                <Td>{p.qty.toLocaleString("cs-CZ", { maximumFractionDigits: 2 })}</Td>
                <Td>{formatPrice(Math.round(p.revenue))}</Td>
                <Td>{profit(p.revenue, p.cost)}</Td>
                <Td>{formatDay(p.last.slice(0, 10))}</Td>
              </tr>
            ))}
          </Table>
        </section>
      )}
    </>
  );
}
