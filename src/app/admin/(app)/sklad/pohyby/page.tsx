import type { Metadata } from "next";
import Link from "next/link";
import { StockFilters } from "@/components/admin/stock-filters";
import { Table, Td } from "@/components/admin/table";
import { formatDate, formatQty, STOCK_KIND_LABEL, type StockKind, type StockMovementRow } from "@/lib/admin";
import { productName } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";
import { loadMovementLog, MOVEMENT_LOG_LIMIT, type LogParams } from "@/lib/stock-data";

export const metadata: Metadata = { title: "Pohyby skladu" };

/** Deník všech pohybů skladu s filtrem a exportem. */
export default async function StockLogPage({ searchParams }: { searchParams: Promise<LogParams> }) {
  const sp = await searchParams;
  const [db, admin] = await Promise.all([getAuthSupabase(), getAdmin()]);
  const manager = admin?.isManager ?? false;
  const { rows, products } = await loadMovementLog(db, sp);

  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v) query.set(k, v);
  const exportHref = `/admin/export/pohyby.csv${query.size ? `?${query}` : ""}`;
  const sourceOf = (m: StockMovementRow) =>
    m.order_id ? { href: `/admin/objednavky/${m.order_id}`, label: "Objednávka" } : m.pos_sale_id ? { href: `/admin/kasa/uctenka/${m.pos_sale_id}`, label: "Účtenka" } : m.receipt_id ? { href: `/admin/sklad/prijemky#${m.receipt_id}`, label: "Příjemka" } : null;

  return (
    <>
      <h1>Pohyby skladu</h1>
      <p className="mt-1 text-sm text-muted">Každá změna stavu: prodej z webu a kasy, storno, příjem, odpis, inventura i ruční oprava.</p>

      <div className="mt-4">
        <StockFilters
          action="/admin/sklad/pohyby"
          search={{ name: "q", value: sp.q, placeholder: "Hledat produkt nebo poznámku" }}
          selects={[{ name: "typ", value: sp.typ, label: "Typ pohybu", options: [{ value: "", label: "Všechny typy" }, ...(Object.keys(STOCK_KIND_LABEL) as StockKind[]).map((k) => ({ value: k, label: STOCK_KIND_LABEL[k] }))] }]}
        >
          <input type="date" name="od" defaultValue={sp.od} aria-label="Od" className="min-h-9 w-auto py-1" />
          <span className="text-muted">–</span>
          <input type="date" name="do" defaultValue={sp.do} aria-label="Do" className="min-h-9 w-auto py-1" />
          <a href={exportHref} className="label ml-auto text-[11px] text-green underline">
            Export CSV
          </a>
        </StockFilters>
      </div>

      <div className="mt-3">
        {rows.length === 0 ? (
          <p className="text-muted">Žádný pohyb neodpovídá filtru.</p>
        ) : (
          <Table head={manager ? ["Kdy", "Produkt", "Pohyb", "Změna", "Nákup / j.", "Zdroj", "Poznámka"] : ["Kdy", "Produkt", "Pohyb", "Změna", "Zdroj", "Poznámka"]}>
            {rows.map((m) => {
              const p = products.get(m.product_id);
              const src = sourceOf(m);
              return (
                <tr key={m.id}>
                  <Td className="whitespace-nowrap text-muted">{formatDate(m.created_at)}</Td>
                  <Td>
                    {p ? (
                      <Link href={`/admin/sklad/${m.product_id}`} className="font-semibold text-green hover:underline">
                        {productName(p)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td className="whitespace-nowrap">{STOCK_KIND_LABEL[m.kind]}</Td>
                  <Td className={`whitespace-nowrap tabular-nums ${Number(m.qty) < 0 ? "text-brick-text" : "text-green"}`}>
                    {Number(m.qty) > 0 ? "+" : ""}
                    {formatQty(m.qty, p?.unit ?? "ks")}
                  </Td>
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
        {rows.length >= MOVEMENT_LOG_LIMIT && <p className="mt-1 text-xs text-muted">Zobrazeno posledních {MOVEMENT_LOG_LIMIT} pohybů, zúžte filtr nebo použijte export.</p>}
      </div>
    </>
  );
}
