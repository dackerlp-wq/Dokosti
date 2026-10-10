import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adjustStock } from "@/app/admin/(app)/sklad/actions";
import { StockChart } from "@/components/admin/stock-chart";
import { StockStatusBadge } from "@/components/admin/stock-status";
import { Table, Td } from "@/components/admin/table";
import { Button, buttonClass } from "@/components/ui/button";
import { formatDate, formatDay, formatQty, STOCK_KIND_LABEL, type StockKind, type StockMovementRow } from "@/lib/admin";
import { LINE_INFO, productName, STORAGE_LABEL } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { agoLabel, analyzeStock, inDaysLabel, STOCK_PERIODS, stockAdvice, stockPeriod, type StockProduct } from "@/lib/stock-analysis";
import { fetchMoves, STOCK_PRODUCT_COLUMNS } from "@/lib/stock-data";
import { getAdmin, getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Sklad produktu" };

const DAY = 86_400_000;
const WEEKS = 12;
const MOVE_FILTERS = [
  { id: "", label: "Vše" },
  { id: "prodej", label: "Prodeje" },
  { id: "prijem", label: "Příjmy" },
  { id: "upravy", label: "Úpravy" },
] as const;
const FILTER_KINDS: Record<string, StockKind[]> = {
  prodej: ["prodej_web", "prodej_kasa"],
  prijem: ["prijem", "storno"],
  upravy: ["odpis", "inventura", "oprava", "interni"],
};

type Batch = { id: string; batch_no: string; expires_on: string; qty: number };

/** Detail produktu ve skladu: stav, graf zásoby a prodejů, pohyby, odpis a inventura, doporučení. */
export default async function StockProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ obdobi?: string; typ?: string }> }) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const period = stockPeriod(sp.obdobi);
  const [db, admin, settings] = await Promise.all([getAuthSupabase(), getAdmin(), getSettings()]);
  const manager = admin?.isManager ?? false;
  const now = new Date();
  const [{ data: product }, { data: movements }, { data: batches }] = await Promise.all([
    db.from("products").select(STOCK_PRODUCT_COLUMNS).eq("id", id).maybeSingle(),
    db.from("stock_movements").select("*").eq("product_id", id).order("created_at", { ascending: false }).limit(500),
    db.from("stock_batches").select("id, batch_no, expires_on, qty").eq("product_id", id).gt("qty", 0).order("expires_on"),
  ]);
  if (!product) notFound();
  const p = product as StockProduct;
  const name = productName(p);
  const unit = p.unit;
  const rows = (movements ?? []) as StockMovementRow[];
  const yearMoves = await fetchMoves(db, { since: new Date(now.getTime() - 366 * DAY), productId: id });
  const [stats] = analyzeStock([p], yearMoves, period.days, settings.stock, () => name, now);
  const tracked = p.stock_qty !== null;

  // Stav po každém pohybu: od aktuálního stavu zpět (pohyby jsou jediné, co stav mění).
  let running = Number(p.stock_qty ?? 0);
  const withAfter = rows.map((m) => {
    const after = running;
    running -= Number(m.qty);
    return { ...m, after };
  });
  const kinds = sp.typ ? FILTER_KINDS[sp.typ] : undefined;
  const visible = kinds ? withAfter.filter((m) => kinds.includes(m.kind)) : withAfter;

  // Graf: stav na konci každého z posledních 12 týdnů a prodeje v něm.
  const weekMs = 7 * DAY;
  const weeksStart = now.getTime() - WEEKS * weekMs;
  const stockAtEnd = Array<number>(WEEKS).fill(0);
  const salesInWeek = Array<number>(WEEKS).fill(0);
  for (let i = 0; i < WEEKS; i++) {
    const end = i === WEEKS - 1 ? now.getTime() + 1 : weeksStart + (i + 1) * weekMs;
    let s = Number(p.stock_qty ?? 0);
    for (const m of yearMoves) if (new Date(m.created_at).getTime() >= end) s -= Number(m.qty);
    stockAtEnd[i] = Math.max(0, s);
  }
  for (const m of yearMoves) {
    const t = new Date(m.created_at).getTime();
    if (t < weeksStart) continue;
    if (m.kind === "prodej_web" || m.kind === "prodej_kasa" || m.kind === "storno") salesInWeek[Math.min(WEEKS - 1, Math.floor((t - weeksStart) / weekMs))] -= Number(m.qty);
  }
  const weekLabels = Array.from({ length: WEEKS }, (_, i) => new Date(weeksStart + i * weekMs).toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" }));

  const query = (over: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...over })) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `?${s}` : "";
  };
  const base = `/admin/sklad/${id}`;
  const sourceOf = (m: StockMovementRow) =>
    m.order_id ? { href: `/admin/objednavky/${m.order_id}`, label: "Objednávka" } : m.pos_sale_id ? { href: `/admin/kasa/uctenka/${m.pos_sale_id}`, label: "Účtenka" } : m.receipt_id ? { href: `/admin/sklad/prijemky#${m.receipt_id}`, label: "Příjemka" } : null;
  const expSoon = (batches ?? []) as Batch[];
  const step = unit === "kg" ? "0.001" : "1";

  return (
    <>
      <p className="text-sm">
        <Link href={`/admin/sklad${query({ typ: undefined })}`} className="text-green hover:underline">
          ← Sklad
        </Link>
      </p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>{name}</h1>
          <p className="mt-1 text-sm text-muted">
            {LINE_INFO[p.line].name} · {STORAGE_LABEL[p.storage]} · {formatPrice(p.price_czk)}/{unit}
            {manager && p.purchase_price_czk ? ` · nákup ${formatPrice(Number(p.purchase_price_czk))}/${unit}` : ""} · limit {formatQty(p.low_stock_threshold, unit)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/produkty/${id}`} className={buttonClass("secondary")}>
            Upravit produkt
          </Link>
          <Link href="/admin/sklad/prijemky" className={buttonClass("primary")}>
            Příjemka
          </Link>
        </div>
      </div>

      {!tracked ? (
        <p className="mt-5 rounded-[var(--radius-card)] border border-line bg-paper p-4 text-sm">
          Tento produkt nemá evidované množství, řídí se jen přepínačem Skladem. Evidenci zapnete v{" "}
          <Link href={`/admin/produkty/${id}`} className="text-green underline">
            úpravě produktu
          </Link>{" "}
          (pole Kusů skladem) nebo první příjemkou.
        </p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="label text-[11px] text-muted">Období prodejů</span>
            {STOCK_PERIODS.map((o) => (
              <Link key={o.id} href={`${base}${query({ obdobi: o.id })}`} className={`label inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] ${o.id === period.id ? "border-green bg-green text-cream" : "border-line bg-paper text-green hover:border-green"}`}>
                {o.label}
              </Link>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Skladem" value={formatQty(stats.stock, unit)} sub={`${formatPrice(stats.valueCzk)} v prodejních cenách`} />
            <Stat label={`Prodáno za ${period.label.toLowerCase()}`} value={formatQty(stats.sold, unit)} sub={`${formatQty(stats.weekly.reduce((a, b) => a + b, 0), unit)} za 12 týdnů`} />
            <Stat label="Dní zásoby" value={stats.daysOfStock === Infinity ? "∞" : String(Math.round(stats.daysOfStock))} sub={stats.daysOfStock === Infinity ? "bez prodeje v období" : `při současném tempu dojde ${inDaysLabel(Math.round(stats.daysOfStock))}`} warn={stats.status === "slow" || stats.status === "dead"} />
            <Stat label="Poslední prodej" value={agoLabel(stats.daysSinceSale)} sub={`naskladněno ${agoLabel(stats.daysSinceReceipt, "—")}`} small />
            <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
              <p className="label text-[11px] text-muted">Stav</p>
              <p className="mt-2">
                <StockStatusBadge status={stats.status} />
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className="min-w-0">
              <section className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-[20px]">Stav zásoby a prodeje po týdnech</h2>
                  <span className="text-xs text-muted">posledních 12 týdnů</span>
                </div>
                <div className="mt-2">
                  <StockChart stock={stockAtEnd} sales={salesInWeek.map((v) => Math.max(0, v))} low={p.low_stock_threshold} unit={unit} weekLabels={weekLabels} />
                </div>
              </section>

              <section className="mt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-[20px]">Pohyby</h2>
                  <div className="flex flex-wrap gap-2">
                    {MOVE_FILTERS.map((f) => (
                      <Link key={f.id} href={`${base}${query({ typ: f.id || undefined })}`} className={`label inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] ${(sp.typ ?? "") === f.id ? "border-green bg-green text-cream" : "border-line bg-paper text-green hover:border-green"}`}>
                        {f.label}
                      </Link>
                    ))}
                  </div>
                </div>
                <div className="mt-2">
                  {visible.length === 0 ? (
                    <p className="text-muted">Žádný pohyb.</p>
                  ) : (
                    <Table head={manager ? ["Kdy", "Pohyb", "Změna", "Stav po", "Nákup / j.", "Zdroj", "Poznámka"] : ["Kdy", "Pohyb", "Změna", "Stav po", "Zdroj", "Poznámka"]}>
                      {visible.map((m) => {
                        const src = sourceOf(m);
                        return (
                          <tr key={m.id}>
                            <Td className="whitespace-nowrap text-muted">{formatDate(m.created_at)}</Td>
                            <Td className="whitespace-nowrap">{STOCK_KIND_LABEL[m.kind]}</Td>
                            <Td className={`whitespace-nowrap tabular-nums ${Number(m.qty) < 0 ? "text-brick-text" : "text-green"}`}>
                              {Number(m.qty) > 0 ? "+" : ""}
                              {formatQty(m.qty, unit)}
                            </Td>
                            <Td className="whitespace-nowrap tabular-nums">{formatQty(Math.max(0, m.after), unit)}</Td>
                            {manager && <Td className="whitespace-nowrap text-muted">{m.unit_cost_czk != null ? formatPrice(Number(m.unit_cost_czk)) : ""}</Td>}
                            <Td>
                              {src ? (
                                <Link href={src.href} className="text-green hover:underline">
                                  {src.label}
                                </Link>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </Td>
                            <Td className="text-muted">{m.note}</Td>
                          </tr>
                        );
                      })}
                    </Table>
                  )}
                  {rows.length >= 500 && <p className="mt-1 text-xs text-muted">Zobrazeno posledních 500 pohybů.</p>}
                </div>
              </section>
            </div>

            <div className="space-y-5">
              <form action={adjustStock} className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
                <h2 className="text-[20px]">Odpis, interní výdej, inventura</h2>
                <input type="hidden" name="product_id" value={id} />
                <input type="hidden" name="redirect" value={base} />
                <label className="mt-3 block">
                  <span className="label mb-1 block text-[11px] text-muted">Typ pohybu</span>
                  <select name="kind" defaultValue="odpis">
                    <option value="odpis">Odpis (prošlé, poškozené)</option>
                    <option value="interni">Interní výdej (ochutnávka, vzorek, vlastní psi, dar)</option>
                    <option value="inventura">Inventura (nový skutečný stav)</option>
                  </select>
                </label>
                <label className="mt-3 block">
                  <span className="label mb-1 block text-[11px] text-muted">Množství ({unit})</span>
                  <input name="qty" type="number" min={0} step={step} required />
                </label>
                <label className="mt-3 block">
                  <span className="label mb-1 block text-[11px] text-muted">Poznámka</span>
                  <input name="note" placeholder="důvod, volitelné" />
                </label>
                <Button type="submit" variant="secondary" className="mt-4 w-full">
                  Zapsat pohyb
                </Button>
                <p className="mt-2 text-xs text-muted">Příjem zboží jde přes příjemku. Každá změna stavu vytvoří záznam v pohybech, i ruční změna čísla u produktu.</p>
              </form>

              <section className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
                <h2 className="text-[20px]">Doporučení</h2>
                <p className="mt-2 text-sm">{stockAdvice(stats, period.days, settings.stock, unit)}</p>
              </section>

              {expSoon.length > 0 && (
                <section className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
                  <h2 className="text-[20px]">Šarže na skladě</h2>
                  <ul className="mt-2 space-y-1 text-sm">
                    {expSoon.map((b) => {
                      const days = Math.floor((new Date(b.expires_on + "T12:00:00").getTime() - now.getTime()) / DAY);
                      return (
                        <li key={b.id} className="flex justify-between gap-2">
                          <span>
                            {b.batch_no || "bez čísla"} · {formatQty(b.qty, unit)}
                          </span>
                          <span className={days < 14 ? "text-brick-text" : "text-muted"}>do {formatDay(b.expires_on)}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 text-xs text-muted">
                    Šarže se upravují v{" "}
                    <Link href={`/admin/produkty/${id}`} className="text-green underline">
                      úpravě produktu
                    </Link>
                    .
                  </p>
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Stat({ label, value, sub, warn, small }: { label: string; value: string; sub?: string; warn?: boolean; small?: boolean }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
      <p className="label text-[11px] text-muted">{label}</p>
      <p className={`font-display font-semibold ${small ? "text-[18px]" : "text-[24px]"} ${warn ? "text-brick-text" : ""}`}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}
