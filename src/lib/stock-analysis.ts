import type { LineSlug, ProductUnit, Storage } from "@/lib/catalog";
import type { StockKind } from "@/lib/admin";
import type { Settings } from "@/lib/settings";

/**
 * Vyhodnocení skladu z pohybů (stock_movements): co se prodává, co leží, kolik dní zásoba vydrží.
 * Čisté funkce bez databáze, data jim předává stránka /admin/sklad.
 */

export const STOCK_PERIODS = [
  { id: "30", label: "30 dní", days: 30 },
  { id: "90", label: "90 dní", days: 90 },
  { id: "365", label: "Rok", days: 365 },
] as const;
export type StockPeriodId = (typeof STOCK_PERIODS)[number]["id"];

export function stockPeriod(id: string | undefined) {
  return STOCK_PERIODS.find((p) => p.id === id) ?? STOCK_PERIODS[1];
}

export type StockStatus = "ok" | "slow" | "dead" | "low" | "out";
export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  ok: "Prodává se",
  slow: "Pomalé",
  dead: "Ležák",
  low: "Docházející",
  out: "Vyprodáno",
};

/** Produkt tak, jak ho potřebuje vyhodnocení (podmnožina sloupců products). */
export type StockProduct = {
  id: string;
  slug: string;
  line: LineSlug;
  variant: string;
  unit: ProductUnit;
  storage: Storage;
  price_czk: number;
  purchase_price_czk: number | null;
  stock_qty: number | string | null;
  low_stock_threshold: number;
  in_stock: boolean;
  is_published: boolean;
  supplier_id?: string | null;
  pack_size?: number | null;
};

/** Doporučené množství k doobjednání: spotřeba na `reorderDays` mínus zásoba, zaokrouhlené na balení nahoru. */
export function suggestedOrderQty(s: Pick<ProductStats, "sold" | "stock" | "product">, periodDays: number, settings: Settings["stock"]): number {
  const need = (s.sold / periodDays) * (settings.reorderDays + settings.leadDays) - s.stock;
  if (need <= 0) return 0;
  const pack = s.product.pack_size && s.product.pack_size > 0 ? s.product.pack_size : s.product.unit === "kg" ? 1 : 1;
  return Math.ceil(need / pack) * pack;
}

/** Pohyb tak, jak ho potřebuje vyhodnocení. */
export type StockMove = { product_id: string; kind: StockKind; qty: number | string; created_at: string };

export type ProductStats = {
  product: StockProduct;
  name: string;
  stock: number;
  /** Prodáno za zvolené období (prodeje mínus storna), v jednotkách produktu. */
  sold: number;
  /** Prodáno za posledních 12 týdnů po týdnech, nejstarší první. */
  weekly: number[];
  /** Dní zásoby při tempu prodejů za období; Infinity = bez prodeje. */
  daysOfStock: number;
  /** Dní od posledního prodeje; null = žádný prodej v načtené historii. */
  daysSinceSale: number | null;
  /** Dní od posledního příjmu; null = žádný v načtené historii. */
  daysSinceReceipt: number | null;
  status: StockStatus;
  /** Hodnota zásoby v prodejních cenách, Kč. */
  valueCzk: number;
  /** Hodnota zásoby v nákupních cenách, Kč; null = nákupní cena není známá. */
  costCzk: number | null;
};

const SALE_KINDS: StockKind[] = ["prodej_web", "prodej_kasa"];
const DAY = 86_400_000;

export function daysBetween(fromIso: string, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - new Date(fromIso).getTime()) / DAY));
}

/** Stav podle zásoby, limitu produktu a tempa prodeje. Pořadí: vyprodáno, docházející, ležák, pomalé, prodává se. */
export function stockStatus(input: { stock: number; low: number; daysOfStock: number; daysSinceSale: number | null }, s: Settings["stock"]): StockStatus {
  if (input.stock <= 0) return "out";
  if (input.stock <= input.low) return "low";
  if (input.daysSinceSale === null || input.daysSinceSale > s.deadDays) return "dead";
  if (input.daysOfStock > s.slowDays) return "slow";
  return "ok";
}

/**
 * Spočítá statistiky každého evidovaného produktu. `moves` jsou pohyby za posledních
 * nejméně 365 dní (starší se do „posledního prodeje“ nepromítnou).
 */
export function analyzeStock(products: StockProduct[], moves: StockMove[], periodDays: number, settings: Settings["stock"], productName: (p: StockProduct) => string, now = new Date()): ProductStats[] {
  const byProduct = new Map<string, StockMove[]>();
  for (const m of moves) {
    const list = byProduct.get(m.product_id);
    if (list) list.push(m);
    else byProduct.set(m.product_id, [m]);
  }
  const periodStart = now.getTime() - periodDays * DAY;
  const weeksStart = now.getTime() - 12 * 7 * DAY;

  return products
    .filter((p) => p.stock_qty !== null)
    .map((p) => {
      const stock = Number(p.stock_qty);
      const list = byProduct.get(p.id) ?? [];
      let sold = 0;
      const weekly = Array<number>(12).fill(0);
      let lastSale: number | null = null;
      let lastReceipt: number | null = null;
      for (const m of list) {
        const t = new Date(m.created_at).getTime();
        const qty = Number(m.qty);
        const isSale = SALE_KINDS.includes(m.kind);
        if (isSale || m.kind === "storno") {
          // prodej je záporný pohyb, storno kladný: prodáno = −(součet)
          if (t >= periodStart) sold -= qty;
          if (t >= weeksStart) weekly[Math.min(11, Math.floor((t - weeksStart) / (7 * DAY)))] -= qty;
        }
        if (isSale && (lastSale === null || t > lastSale)) lastSale = t;
        if (m.kind === "prijem" && (lastReceipt === null || t > lastReceipt)) lastReceipt = t;
      }
      sold = Math.max(0, sold);
      const daysOfStock = sold > 0 ? stock / (sold / periodDays) : Infinity;
      const daysSinceSale = lastSale === null ? null : Math.floor((now.getTime() - lastSale) / DAY);
      const daysSinceReceipt = lastReceipt === null ? null : Math.floor((now.getTime() - lastReceipt) / DAY);
      const status = stockStatus({ stock, low: p.low_stock_threshold, daysOfStock, daysSinceSale }, settings);
      return {
        product: p,
        name: productName(p),
        stock,
        sold,
        weekly: weekly.map((v) => Math.max(0, v)),
        daysOfStock,
        daysSinceSale,
        daysSinceReceipt,
        status,
        valueCzk: Math.round(stock * p.price_czk),
        costCzk: p.purchase_price_czk && p.purchase_price_czk > 0 ? Math.round(stock * p.purchase_price_czk) : null,
      };
    });
}

export const STOCK_SORTS = [
  { id: "hodnota", label: "Hodnota zásoby" },
  { id: "dny", label: "Dní zásoby" },
  { id: "bezprodeje", label: "Nejdéle bez prodeje" },
  { id: "prodano", label: "Nejprodávanější" },
  { id: "skladem", label: "Skladem" },
  { id: "nazev", label: "Název" },
] as const;
export type StockSortId = (typeof STOCK_SORTS)[number]["id"];

export function sortStats(list: ProductStats[], sort: string | undefined): ProductStats[] {
  const fin = (n: number) => (n === Infinity ? Number.MAX_SAFE_INTEGER : n);
  const since = (n: number | null) => (n === null ? Number.MAX_SAFE_INTEGER : n);
  const cmp: Record<StockSortId, (a: ProductStats, b: ProductStats) => number> = {
    hodnota: (a, b) => b.valueCzk - a.valueCzk,
    dny: (a, b) => fin(b.daysOfStock) - fin(a.daysOfStock),
    bezprodeje: (a, b) => since(b.daysSinceSale) - since(a.daysSinceSale),
    prodano: (a, b) => b.sold - a.sold,
    skladem: (a, b) => b.stock - a.stock,
    nazev: (a, b) => a.name.localeCompare(b.name, "cs"),
  };
  const fn = cmp[(sort ?? "hodnota") as StockSortId] ?? cmp.hodnota;
  return [...list].sort((a, b) => fn(a, b) || a.name.localeCompare(b.name, "cs"));
}

/** „dnes“, „včera“, „před 12 dny“; null = „nikdy“ (v načtené historii). */
export function agoLabel(days: number | null, never = "déle než rok") {
  if (days === null) return never;
  if (days === 0) return "dnes";
  if (days === 1) return "včera";
  return `před ${days} dny`;
}

/** Datum za N dní od teď, krátce („14. 11.“). */
export function inDaysLabel(days: number, now = new Date()) {
  const d = new Date(now.getTime() + days * DAY);
  return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
}

/** Doporučení k produktu: slovy, bez zdravotních a cenových tvrzení. */
export function stockAdvice(s: ProductStats, periodDays: number, settings: Settings["stock"], unit: string): string {
  const perWeek = (s.sold / periodDays) * 7;
  const fmt = (n: number) => (unit === "kg" ? n.toLocaleString("cs-CZ", { maximumFractionDigits: 1 }) : String(Math.ceil(n)));
  switch (s.status) {
    case "out":
      return s.sold > 0
        ? `Vyprodáno, přitom se prodávalo ${fmt(perWeek)} ${unit} týdně. Doobjednejte aspoň ${fmt((s.sold / periodDays) * settings.reorderDays)} ${unit} (zásoba na ${settings.reorderDays} dní).`
        : "Vyprodáno a za období bez prodeje. Doobjednejte jen na základě poptávky.";
    case "low":
      return s.sold > 0
        ? `Zásoba je pod limitem ${s.product.low_stock_threshold} ${unit}. Při tempu ${fmt(perWeek)} ${unit} týdně dojde za ${Math.round(s.daysOfStock)} dní; doobjednejte ${fmt((s.sold / periodDays) * settings.reorderDays)} ${unit}.`
        : `Zásoba je pod limitem ${s.product.low_stock_threshold} ${unit}, ale za období se nic neprodalo. Doobjednávat zatím není třeba.`;
    case "dead":
      return `Bez prodeje ${s.daysSinceSale === null ? "déle než rok" : `${s.daysSinceSale} dní`}, skladem ${fmt(s.stock)} ${unit}. Zvažte akci nebo zařazení do newsletteru; u mraženého a chlazeného zboží hlídejte expiraci šarží.`;
    case "slow":
      return `Zásoba vydrží ${Math.round(s.daysOfStock)} dní. Příští objednávku u dodavatele odložte, případně zboží zviditelněte.`;
    default:
      return `Prodeje stabilní (${fmt(perWeek)} ${unit} týdně), zásoba na ${Math.round(s.daysOfStock)} dní. Doobjednat kolem ${inDaysLabel(Math.max(0, Math.round(s.daysOfStock) - settings.leadDays))}.`;
  }
}
