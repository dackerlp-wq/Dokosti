import { LINE_INFO, STORAGE_LABEL } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { agoLabel, sortStats, STOCK_STATUS_LABEL, stockPeriod } from "@/lib/stock-analysis";
import { loadStockStats } from "@/lib/stock-data";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

/** Export přehledu skladu: CSV se středníkem (Excel s českým nastavením). Stejné filtry jako stránka. */
export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) return new Response("Nepřihlášený uživatel", { status: 401 });
  const sp = new URL(request.url).searchParams;
  const period = stockPeriod(sp.get("obdobi") ?? undefined);
  const [db, settings] = await Promise.all([getAuthSupabase(), getSettings()]);
  const { stats } = await loadStockStats(db, period.days, settings.stock);
  const q = (sp.get("q") ?? "").trim().toLowerCase();
  const rada = sp.get("rada");
  const stav = sp.get("stav");
  const list = sortStats(
    stats.filter((s) => (!rada || s.product.line === rada) && (!stav || s.status === stav) && (!q || s.name.toLowerCase().includes(q))),
    sp.get("razeni") ?? undefined,
  );

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const num = (n: number) => n.toLocaleString("cs-CZ", { maximumFractionDigits: 3, useGrouping: false });
  const head = ["Produkt", "Řada", "Uskladnění", "Jednotka", "Skladem", `Prodáno za ${period.days} dní`, "Dní zásoby", "Poslední prodej (dní)", "Naskladněno (dní)", "Stav", "Limit", "Cena e-shop", "Cena prodejna", "Hodnota zásoby Kč", ...(admin.isManager ? ["Nákupní cena", "Hodnota v nákupních cenách Kč"] : [])];
  const lines = list.map((s) =>
    [
      s.name,
      LINE_INFO[s.product.line].name,
      STORAGE_LABEL[s.product.storage],
      s.product.unit,
      num(s.stock),
      num(s.sold),
      s.daysOfStock === Infinity ? "" : Math.round(s.daysOfStock),
      s.daysSinceSale ?? agoLabel(null),
      s.daysSinceReceipt ?? "",
      STOCK_STATUS_LABEL[s.status],
      s.product.low_stock_threshold,
      s.product.price_czk,
      s.product.store_price_czk ?? s.product.price_czk,
      s.valueCzk,
      ...(admin.isManager ? [s.product.purchase_price_czk ?? "", s.costCzk ?? ""] : []),
    ]
      .map(esc)
      .join(";"),
  );
  const csv = "﻿" + [head.map(esc).join(";"), ...lines].join("\r\n");
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="sklad-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
