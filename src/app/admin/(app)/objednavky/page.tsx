import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Pills } from "@/components/admin/stat";
import { StatusBadge } from "@/components/admin/status-badge";
import { StockFilters } from "@/components/admin/stock-filters";
import { Table, Td } from "@/components/admin/table";
import { buttonClass } from "@/components/ui/button";
import { formatDate, formatDay, PAYMENT_LABEL, SHIPPING_LABEL, type OrderItemRow, type OrderRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { OrderStep } from "@/components/admin/order-step";
import { buildOrdersQuery, OPEN_STATUSES as OPEN, ORDER_VIEWS as VIEWS, type OrderListParams, type OrderView as View } from "@/lib/orders-query";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Objednávky" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<OrderListParams> }) {
  await requireAdmin();
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const db = await getAuthSupabase();
  const { query, view } = buildOrdersQuery(db, sp, today);
  const { data } = await query.limit(200);
  const orders = (data ?? []) as OrderRow[];
  const { data: itemsData } = orders.length ? await db.from("order_items").select("id, order_id, product_slug, name, qty, unit_price_czk").in("order_id", orders.map((o) => o.id)) : { data: [] };
  const itemsByOrder = new Map<string, OrderItemRow[]>();
  for (const i of (itemsData ?? []) as (OrderItemRow & { order_id: string })[]) itemsByOrder.set(i.order_id, [...(itemsByOrder.get(i.order_id) ?? []), i]);

  const [{ count: openCount }, { count: todayCount }, { count: unpaidCount }] = await Promise.all([
    db.from("orders").select("id", { count: "exact", head: true }).in("status", OPEN),
    db.from("orders").select("id", { count: "exact", head: true }).in("status", OPEN).eq("delivery_date", today),
    db.from("orders").select("id", { count: "exact", head: true }).in("status", OPEN).is("paid_at", null).neq("payment_method", "hotove"),
  ]);
  const counts: Partial<Record<View, number>> = { vyrizeni: openCount ?? 0, dnes: todayCount ?? 0, nezaplacene: unpaidCount ?? 0 };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v) params.set(k, v);
  const exportHref = `/admin/export/objednavky.csv?${params}`;

  return (
    <>
      <PageHeader
        title="Objednávky"
        subtitle="Pohledy podle práce, další krok přímo v řádku. Zrušit nebo vrátit stav jde v detailu."
        actions={
          <>
            <Link href="/admin/rozvoz/stitky" className={buttonClass("secondary")}>
              Tisk štítků
            </Link>
            <Link href="/admin/objednavky/nova" className={buttonClass("primary")}>
              Nová objednávka
            </Link>
          </>
        }
      />

      <div className="mt-4">
        <Pills items={VIEWS.map((v) => ({ href: `/admin/objednavky?zobrazit=${v.id}`, label: counts[v.id] !== undefined ? `${v.label} · ${counts[v.id]}` : v.label, on: view === v.id }))} />
      </div>
      <div className="mt-3">
        <StockFilters
          action="/admin/objednavky"
          hidden={{ zobrazit: view }}
          search={{ name: "q", value: sp.q, placeholder: "Číslo, jméno, telefon, e-mail" }}
          selects={[
            { name: "zpusob", value: sp.zpusob, label: "Dodání", options: [{ value: "", label: "Všechna dodání" }, ...Object.entries(SHIPPING_LABEL).map(([value, label]) => ({ value, label }))] },
            {
              name: "platba",
              value: sp.platba,
              label: "Platba",
              options: [
                { value: "", label: "Všechny platby" },
                { value: "zaplaceno", label: "Zaplaceno" },
                { value: "nezaplaceno", label: "Nezaplaceno" },
              ],
            },
          ]}
        >
          <input type="date" name="od" defaultValue={sp.od} aria-label="Od" className="min-h-9 w-auto py-1" />
          <span className="text-muted">–</span>
          <input type="date" name="do" defaultValue={sp.do} aria-label="Do" className="min-h-9 w-auto py-1" />
          <a href={exportHref} className="ml-auto text-small font-semibold text-brick-text underline">
            Export CSV
          </a>
        </StockFilters>
      </div>

      <div className="mt-4">
        {orders.length === 0 ? (
          <p className="text-muted">{view === "vyrizeni" ? "Nic k vyřízení. Máte hotovo." : view === "dnes" ? "Dnes nic k výdeji ani rozvozu." : view === "nezaplacene" ? "Všechno je zaplacené." : "Žádné objednávky."}</p>
        ) : (
          <Table head={["Objednávka", "Zákazník", "Dodání", "Položky", "Celkem", "Stav", ""]}>
            {orders.map((o) => {
              const items = itemsByOrder.get(o.id) ?? [];
              const isToday = o.delivery_date === today && OPEN.includes(o.status);
              return (
                <tr key={o.id} className={isToday ? "bg-paper/60" : ""}>
                  <Td>
                    <Link href={`/admin/objednavky/${o.id}`} className="font-semibold text-brick-text hover:underline">
                      {o.order_number}
                    </Link>
                    <div className="text-small text-muted">
                      {formatDate(o.created_at)}
                      {o.subscription_id && " · předplatné"}
                      {o.created_by && " · z adminu"}
                    </div>
                  </Td>
                  <Td>
                    {o.customer_id ? (
                      <Link href={`/admin/zakaznici/${o.customer_id}`} className="hover:underline">
                        {o.customer_name}
                      </Link>
                    ) : (
                      o.customer_name
                    )}
                    <div className="text-small text-muted">
                      <a href={`tel:${o.customer_phone}`} className="hover:underline">
                        {o.customer_phone}
                      </a>
                    </div>
                  </Td>
                  <Td>
                    <span className="font-semibold">{SHIPPING_LABEL[o.shipping_method]}</span>
                    <div className={`text-small ${isToday ? "font-semibold text-brick-text" : "text-muted"}`}>{o.delivery_date ? (isToday ? "dnes" : formatDay(o.delivery_date)) : o.shipping_method === "rozvoz" ? "bez termínu" : ""}</div>
                  </Td>
                  <Td className="max-w-[260px]">
                    {items.slice(0, 2).map((i) => (
                      <div key={i.id} className="truncate text-sm">
                        {i.qty}× {i.name}
                      </div>
                    ))}
                    {items.length > 2 && <div className="text-small text-muted">a další {items.length - 2}</div>}
                  </Td>
                  <Td className="whitespace-nowrap">
                    <span className="font-semibold">{formatPrice(o.total_czk)}</span>
                    <div className={`text-small ${o.paid_at || o.payment_method === "hotove" ? "text-muted" : "text-brick-text"}`}>{o.paid_at ? "zaplaceno" : o.payment_method === "hotove" ? "na místě" : `${PAYMENT_LABEL[o.payment_method].toLowerCase()}, nezaplaceno`}</div>
                  </Td>
                  <Td>
                    <StatusBadge status={o.status} />
                  </Td>
                  <Td className="whitespace-nowrap text-right">
                    <NextStep o={o} />
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
        {orders.length >= 200 && <p className="mt-1 text-small text-muted">Zobrazeno prvních 200, zúžte filtr nebo použijte export.</p>}
      </div>
    </>
  );
}

/** Jeden další krok podle stavu a způsobu dodání. */
function NextStep({ o }: { o: OrderRow }) {
  const cls = buttonClass("secondary", "min-h-8 px-3 text-[11px]");
  if (o.status === "nova") return <OrderStep id={o.id} status="potvrzena" label="Potvrdit" />;
  if (o.status === "potvrzena") return <OrderStep id={o.id} status="pripravena" label="Připraveno" />;
  if (o.status === "pripravena" && o.shipping_method === "odber")
    return (
      <Link href="/admin/kasa?zalozka=vydej" className={cls}>
        Vydat u kasy
      </Link>
    );
  if (o.status === "pripravena") return <OrderStep id={o.id} status="doruceno" label={o.shipping_method === "rozvoz" ? "Doručeno" : "Odesláno"} />;
  return null;
}
