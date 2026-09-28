import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { formatDate, formatDay, formatQty, SHIPPING_LABEL, type OrderRow, type ProductRow } from "@/lib/admin";
import { productName } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

type Todo = { kind: string; kindStyle: "brick" | "ochre" | "plain"; title: string; detail: string; action: string; href: string };
type Move = { at: string; text: string; right: string; href: string };

/** Přehled = dnes: čísla, co je potřeba udělat, týden v číslech a poslední pohyby. */
export default async function AdminHome() {
  const [admin, db] = await Promise.all([getAdmin(), getAuthSupabase()]);
  const manager = admin?.isManager ?? false;
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(dayStart);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const soon = new Date(now);
  soon.setDate(soon.getDate() + 14);
  const soonIso = soon.toISOString().slice(0, 10);

  const [{ data: open }, { data: stock }, { data: expiring }, { data: inquiries }, { data: shift }, { data: posToday }, { data: webToday }, { data: posWeek }, { data: webWeek }, { count: clubTotal }, { count: clubWeek }, { data: failedSubs }, { data: lastSales }, { data: lastOrders }, { data: lastCards }, { data: lastReceipts }, { data: weekItems }] = await Promise.all([
    db.from("orders").select("*").in("status", ["nova", "potvrzena", "pripravena"]).order("created_at", { ascending: false }),
    db.from("products").select("*").not("stock_qty", "is", null).order("stock_qty"),
    db.from("stock_batches").select("id, product_id, batch_no, expires_on, qty, products(slug, line, variant)").gt("qty", 0).lte("expires_on", soonIso).order("expires_on"),
    db.from("inquiries").select("id, name, question, created_at").eq("answered", false).order("created_at", { ascending: false }).limit(5),
    db.from("pos_shifts").select("opened_at").is("closed_at", null).order("opened_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("pos_sales").select("total_czk").eq("status", "zaplaceno").is("order_id", null).gte("created_at", dayStart.toISOString()),
    db.from("orders").select("total_czk").neq("status", "zrusena").gte("created_at", dayStart.toISOString()),
    db.from("pos_sales").select("total_czk").eq("status", "zaplaceno").is("order_id", null).gte("created_at", weekStart.toISOString()),
    db.from("orders").select("total_czk").neq("status", "zrusena").gte("created_at", weekStart.toISOString()),
    db.from("customers").select("id", { count: "exact", head: true }).not("user_id", "is", null),
    db.from("customers").select("id", { count: "exact", head: true }).gte("registered_at", weekStart.toISOString()),
    db.from("subscriptions").select("id, customer_name, last_error").eq("status", "aktivni").not("last_error", "is", null).limit(5),
    db.from("pos_sales").select("id, number, total_czk, created_at, status").order("created_at", { ascending: false }).limit(4),
    db.from("orders").select("id, order_number, total_czk, created_at, customer_name").order("created_at", { ascending: false }).limit(4),
    db.from("cards").select("code, assigned_at, customers(id, name)").not("assigned_at", "is", null).order("assigned_at", { ascending: false }).limit(3),
    db.from("stock_receipts").select("id, number, supplier, created_at").order("created_at", { ascending: false }).limit(3),
    manager ? db.from("pos_sale_items").select("name, qty, pos_sales!inner(created_at, status)").gte("pos_sales.created_at", weekStart.toISOString()).eq("pos_sales.status", "zaplaceno") : Promise.resolve({ data: [] }),
  ]);

  const orders = (open ?? []) as OrderRow[];
  const low = ((stock ?? []) as ProductRow[]).filter((p) => p.stock_qty !== null && Number(p.stock_qty) <= p.low_stock_threshold);
  type Exp = { id: string; product_id: string; batch_no: string; expires_on: string; qty: number; products: { slug: string; line: ProductRow["line"]; variant: string } | null };
  const exp = (expiring ?? []) as unknown as Exp[];
  const asks = (inquiries ?? []) as { id: string; name: string; question: string; created_at: string }[];
  const subsFailed = (failedSubs ?? []) as { id: string; customer_name: string; last_error: string }[];
  const sum = (rows: { total_czk: number }[] | null) => (rows ?? []).reduce((n, r) => n + r.total_czk, 0);
  const posDay = sum(posToday);
  const webDay = sum(webToday);
  const weekRevenue = sum(posWeek) + sum(webWeek);
  const weekCount = (posWeek ?? []).length + (webWeek ?? []).length;
  const todayPickups = orders.filter((o) => o.shipping_method === "odber" && o.delivery_date === todayIso);
  const todayDeliveries = orders.filter((o) => o.shipping_method === "rozvoz" && o.delivery_date === todayIso);
  const fresh = orders.filter((o) => o.status === "nova");
  const shiftRow = shift as { opened_at: string } | null;

  // Nejprodávanější tento týden (kasa + web zvlášť by bylo přesnější, kasa stačí pro rychlý přehled).
  const topMap = new Map<string, number>();
  for (const i of (weekItems ?? []) as { name: string; qty: number }[]) topMap.set(i.name, (topMap.get(i.name) ?? 0) + Number(i.qty));
  const top = [...topMap.entries()].sort((a, b) => b[1] - a[1])[0];

  const todos: Todo[] = [
    ...todayPickups.map((o) => ({ kind: "Dnes", kindStyle: "brick" as const, title: `${o.order_number} · ${o.customer_name}`, detail: `osobní odběr dnes · ${formatPrice(o.total_czk)}${o.paid_at ? " · zaplaceno" : ""}`, action: "Vydat u kasy", href: "/admin/kasa" })),
    ...todayDeliveries.map((o) => ({ kind: "Dnes", kindStyle: "brick" as const, title: `${o.order_number} · ${o.customer_name}`, detail: `rozvoz dnes · ${o.street}, ${o.city} · ${formatPrice(o.total_czk)}`, action: "Rozvoz", href: "/admin/rozvoz" })),
    ...fresh.map((o) => ({ kind: "Nová", kindStyle: "ochre" as const, title: `${o.order_number} · ${o.customer_name}`, detail: `${SHIPPING_LABEL[o.shipping_method]}${o.delivery_date ? ` ${formatDay(o.delivery_date)}` : ""} · ${formatPrice(o.total_czk)} · ${o.paid_at ? "zaplaceno" : "nezaplaceno"}`, action: "Potvrdit", href: `/admin/objednavky/${o.id}` })),
    ...subsFailed.map((s) => ({ kind: "Předplatné", kindStyle: "brick" as const, title: s.customer_name, detail: `objednávka nevznikla: ${s.last_error}`, action: "Vyřešit", href: `/admin/predplatne/${s.id}` })),
    ...low.map((p) => ({ kind: "Sklad", kindStyle: "plain" as const, title: `${productName(p)} dochází`, detail: `${formatQty(p.stock_qty, p.unit)} na skladě`, action: "Naskladnit", href: "/admin/sklad" })),
    ...exp.map((b) => ({ kind: "Expirace", kindStyle: "plain" as const, title: b.products ? productName(b.products) : "produkt", detail: `${b.batch_no ? `${b.batch_no} · ` : ""}do ${formatDay(b.expires_on)} · ${b.qty} ks`, action: "Zobrazit", href: `/admin/produkty/${b.product_id}` })),
    ...asks.map((a) => ({ kind: "Poradna", kindStyle: "plain" as const, title: `Dotaz od ${a.name || "zákazníka"}`, detail: `„${a.question.length > 70 ? a.question.slice(0, 70) + "…" : a.question}“`, action: "Odpovědět", href: "/admin/poradna" })),
  ];

  const moves: Move[] = [
    ...((lastSales ?? []) as { id: string; number: string; total_czk: number; created_at: string; status: string }[]).map((s) => ({ at: s.created_at, text: `Kasa · ${s.number}${s.status === "storno" ? " · storno" : ""}`, right: formatPrice(s.total_czk), href: `/admin/kasa/uctenka/${s.id}` })),
    ...((lastOrders ?? []) as { id: string; order_number: string; total_czk: number; created_at: string; customer_name: string }[]).map((o) => ({ at: o.created_at, text: `Web · ${o.order_number} · ${o.customer_name}`, right: formatPrice(o.total_czk), href: `/admin/objednavky/${o.id}` })),
    ...((lastCards ?? []) as unknown as { code: string; assigned_at: string; customers: { id: string; name: string } | null }[]).map((c) => ({ at: c.assigned_at, text: `Karta ${c.code} · ${c.customers?.name ?? ""}`, right: "", href: c.customers ? `/admin/zakaznici/${c.customers.id}` : "/admin/karty" })),
    ...((lastReceipts ?? []) as { id: string; number: string; supplier: string; created_at: string }[]).map((r) => ({ at: r.created_at, text: `Příjemka ${r.number}${r.supplier ? ` · ${r.supplier}` : ""}`, right: "", href: "/admin/sklad" })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 6);

  const dayName = new Intl.DateTimeFormat("cs-CZ", { weekday: "long", day: "numeric", month: "numeric" }).format(now);
  const card = "rounded-[var(--radius-card)] border border-line bg-paper";
  const kindClass = { brick: "bg-brick text-cream", ochre: "bg-ochre-badge text-ink", plain: "border border-line bg-paper text-muted" };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Dnes, {dayName}</h1>
          <p className="mt-1 text-sm text-muted">{shiftRow ? `Směna v kase otevřená od ${new Date(shiftRow.opened_at).toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" })}` : "Kasa je zavřená."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/sklad" className={buttonClass("secondary")}>
            Příjemka
          </Link>
          <Link href="/admin/objednavky/nova" className={buttonClass("secondary")}>
            Nová objednávka
          </Link>
          <Link href="/admin/kasa" className={buttonClass("primary")}>
            Otevřít kasu
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {manager ? (
          <Stat label="Tržby dnes" value={formatPrice(posDay + webDay)} sub={`prodejna ${formatPrice(posDay)} · web ${formatPrice(webDay)}`} />
        ) : (
          <Stat label="Prodejů dnes" value={String((posToday ?? []).length + (webToday ?? []).length)} sub={`kasa ${(posToday ?? []).length} · web ${(webToday ?? []).length}`} />
        )}
        <Stat label="K vyřízení" value={orders.length === 1 ? "1 objednávka" : orders.length < 5 ? `${orders.length} objednávky` : `${orders.length} objednávek`} sub={`${todayPickups.length + todayDeliveries.length} dnes k výdeji či rozvozu · ${fresh.length} ${fresh.length === 1 ? "nová" : "nových"}`} warn={orders.length > 0} href="/admin/objednavky" />
        <Stat label="Sklad" value={low.length === 0 ? "v pořádku" : `${low.length} dochází`} sub={`expirace do 14 dnů: ${exp.length}`} warn={low.length > 0 || exp.length > 0} href="/admin/sklad" />
        <Stat label="Klub" value={`+${clubWeek ?? 0} ${clubWeek === 1 ? "člen" : (clubWeek ?? 0) > 1 && (clubWeek ?? 0) < 5 ? "členové" : "členů"}`} sub={`tento týden · ${clubTotal ?? 0} celkem`} href="/admin/zakaznici?filtr=ucet" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className={`${card} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-[18px]">Co je potřeba udělat</h2>
            <Link href="/admin/objednavky" className="text-sm text-green hover:underline">
              Všechny objednávky
            </Link>
          </div>
          {todos.length === 0 ? (
            <p className="px-4 py-6 text-muted">Nic nečeká. Máte hotovo.</p>
          ) : (
            <ul className="divide-y divide-line">
              {todos.map((t, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-3">
                  <span className={`label shrink-0 rounded-full px-2.5 py-0.5 text-[10px] ${kindClass[t.kindStyle]}`}>{t.kind}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{t.title}</p>
                    <p className="truncate text-xs text-muted">{t.detail}</p>
                  </div>
                  <Link href={t.href} className={buttonClass("secondary", "min-h-8 shrink-0 px-3 text-[11px]")}>
                    {t.action} <ArrowRight strokeWidth={1.75} className="h-3.5 w-3.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-4">
          {manager && (
            <section className={`${card} p-4`}>
              <h2 className="text-[18px]">Tento týden</h2>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="label text-[11px] text-muted">Tržby</dt>
                  <dd className="font-display text-[20px] font-semibold">{formatPrice(weekRevenue)}</dd>
                </div>
                <div>
                  <dt className="label text-[11px] text-muted">Prodejů</dt>
                  <dd className="font-display text-[20px] font-semibold">{weekCount}</dd>
                </div>
                <div>
                  <dt className="label text-[11px] text-muted">Průměrný nákup</dt>
                  <dd className="font-display text-[20px] font-semibold">{weekCount ? formatPrice(Math.round(weekRevenue / weekCount)) : "–"}</dd>
                </div>
                <div>
                  <dt className="label text-[11px] text-muted">Nejprodávanější v kase</dt>
                  <dd className="mt-1">{top ? `${top[0]}, ${top[1]} ks` : "zatím nic"}</dd>
                </div>
              </dl>
              <Link href="/admin/statistiky" className="mt-3 inline-block text-sm text-green hover:underline">
                Celé statistiky
              </Link>
            </section>
          )}
          <section className={`${card} p-4`}>
            <h2 className="text-[18px]">Poslední pohyby</h2>
            {moves.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Zatím žádné.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {moves.map((m, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3">
                    <Link href={m.href} className="min-w-0 truncate hover:underline">
                      {m.text}
                    </Link>
                    <span className="shrink-0 text-xs text-muted">
                      {formatDate(m.at)}
                      {m.right && ` · ${m.right}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, sub, href, warn }: { label: string; value: string; sub: string; href?: string; warn?: boolean }) {
  const cls = `block rounded-[var(--radius-card)] border bg-paper p-4 ${warn ? "border-brick" : "border-line"} ${href ? "hover:border-green" : ""}`;
  const body = (
    <>
      <p className={`label text-[11px] ${warn ? "text-brick-text" : "text-muted"}`}>{label}</p>
      <p className={`font-display text-[26px] font-semibold leading-tight ${warn ? "text-brick-text" : ""}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
