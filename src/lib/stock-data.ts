import type { SupabaseClient } from "@supabase/supabase-js";
import { STOCK_KIND_LABEL, type ProductRow, type StockKind, type StockMovementRow } from "@/lib/admin";
import { productName } from "@/lib/catalog";
import type { Settings } from "@/lib/settings";
import { analyzeStock, type ProductStats, type StockMove, type StockProduct } from "@/lib/stock-analysis";

/** Načítání dat pro přehled skladu (jen server, přihlášený admin). */

const DAY = 86_400_000;
const PAGE = 1000;

export const STOCK_PRODUCT_COLUMNS = "id, slug, line, variant, unit, storage, price_czk, store_price_czk, purchase_price_czk, stock_qty, low_stock_threshold, in_stock, is_published, supplier_id, pack_size";

/** Pohyby od data, po stránkách (Supabase vrací nejvýš 1000 řádků na dotaz). */
export async function fetchMoves(db: SupabaseClient, opts: { since: Date; productId?: string; kinds?: StockKind[] }): Promise<StockMove[]> {
  const out: StockMove[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = db.from("stock_movements").select("product_id, kind, qty, created_at").gte("created_at", opts.since.toISOString()).order("created_at", { ascending: true }).range(from, from + PAGE - 1);
    if (opts.productId) q = q.eq("product_id", opts.productId);
    if (opts.kinds) q = q.in("kind", opts.kinds);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as StockMove[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

/** Statistiky všech evidovaných produktů za období + počet produktů bez evidence. */
export async function loadStockStats(db: SupabaseClient, periodDays: number, settings: Settings["stock"], now = new Date()): Promise<{ stats: ProductStats[]; untracked: number }> {
  const [{ data: products }, moves] = await Promise.all([
    db.from("products").select(STOCK_PRODUCT_COLUMNS).order("line").order("sort_order").order("variant"),
    fetchMoves(db, { since: new Date(now.getTime() - 366 * DAY) }),
  ]);
  const all = (products ?? []) as StockProduct[];
  return { stats: analyzeStock(all, moves, periodDays, settings, (p) => productName(p), now), untracked: all.filter((p) => p.stock_qty === null).length };
}

export type LogParams = { q?: string; typ?: string; od?: string; do?: string };
export const MOVEMENT_LOG_LIMIT = 300;
export type LogProduct = Pick<ProductRow, "id" | "line" | "variant" | "unit">;

/** Deník pohybů podle filtru (text hledá v názvu produktu i poznámce). `limit` 0 = bez omezení (export). */
export async function loadMovementLog(db: SupabaseClient, sp: LogParams, limit = MOVEMENT_LOG_LIMIT): Promise<{ rows: StockMovementRow[]; products: Map<string, LogProduct> }> {
  const { data: prods } = await db.from("products").select("id, line, variant, unit");
  const products = new Map<string, LogProduct>();
  for (const p of (prods ?? []) as LogProduct[]) products.set(p.id, p);

  const q = (sp.q ?? "").trim();
  const build = () => {
    let query = db.from("stock_movements").select("*").order("created_at", { ascending: false });
    if (sp.typ && sp.typ in STOCK_KIND_LABEL) query = query.eq("kind", sp.typ);
    if (sp.od) query = query.gte("created_at", `${sp.od}T00:00:00`);
    if (sp.do) query = query.lte("created_at", `${sp.do}T23:59:59`);
    if (q) {
      const ids = [...products.values()].filter((p) => productName(p).toLowerCase().includes(q.toLowerCase())).map((p) => p.id);
      // produkt podle názvu, nebo text v poznámce (číslo objednávky, příjemky, důvod)
      query = ids.length ? query.or(`product_id.in.(${ids.join(",")}),note.ilike.%${q.replace(/[%,()]/g, "")}%`) : query.ilike("note", `%${q.replace(/[%,()]/g, "")}%`);
    }
    return query;
  };

  const rows: StockMovementRow[] = [];
  if (limit > 0) {
    const { data, error } = await build().limit(limit);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as StockMovementRow[]));
  } else {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await build().range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      const batch = (data ?? []) as StockMovementRow[];
      rows.push(...batch);
      if (batch.length < PAGE) break;
    }
  }
  return { rows, products };
}
