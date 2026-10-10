import type { Metadata } from "next";
import Link from "next/link";
import { Sparkline } from "@/components/admin/sparkline";
import { StockFilters } from "@/components/admin/stock-filters";
import { StockStatusBadge } from "@/components/admin/stock-status";
import { Table, Td } from "@/components/admin/table";
import { formatQty } from "@/lib/admin";
import { LINE_INFO, LINES, STORAGE_LABEL } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { agoLabel, sortStats, STOCK_PERIODS, STOCK_SORTS, STOCK_STATUS_LABEL, stockPeriod, type StockStatus } from "@/lib/stock-analysis";
import { loadStockStats } from "@/lib/stock-data";
import { getAdmin, getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Sklad" };

type Params = { obdobi?: string; q?: string; rada?: string; stav?: string; razeni?: string };

/** Přehled skladu: co se prodává, co leží, co dochází. Čísla z pohybů skladu za zvolené období. */
export default async function StockOverviewPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdmin();
  const sp = await searchParams;
  const period = stockPeriod(sp.obdobi);
  const [db, admin, settings] = await Promise.all([getAuthSupabase(), getAdmin(), getSettings()]);
  const manager = admin?.isManager ?? false;
  const { stats: all, untracked } = await loadStockStats(db, period.days, settings.stock);

  const q = (sp.q ?? "").trim().toLowerCase();
  const list = sortStats(
    all.filter((s) => (!sp.rada || s.product.line === sp.rada) && (!sp.stav || s.status === sp.stav) && (!q || `${s.name} ${s.product.slug} ${LINE_INFO[s.product.line].name}`.toLowerCase().includes(q))),
    sp.razeni,
  );

  // Souhrn je vždy za všechny evidované produkty, bez ohledu na filtr.
  const totalValue = all.reduce((n, s) => n + s.valueCzk, 0);
  const withCost = all.filter((s) => s.costCzk !== null);
  const totalCost = withCost.reduce((n, s) => n + (s.costCzk ?? 0), 0);
  const soldValue = all.reduce((n, s) => n + Math.round(s.sold * s.product.price_czk), 0);
  const dead = all.filter((s) => s.status === "dead");
  const deadValue = dead.reduce((n, s) => n + s.valueCzk, 0);
  const slow = all.filter((s) => s.status === "slow");
  const low = all.filter((s) => s.status === "low");
  const out = all.filter((s) => s.status === "out");
  const turnover = totalValue > 0 ? ((soldValue / totalValue) * 365) / period.days : 0;

  const query = (over: Partial<Params>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...over })) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const exportHref = `/admin/export/sklad.csv${query({})}`;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Sklad</h1>
          <p className="mt-1 text-sm text-muted">Co se prodává, co leží a co dochází. Prodeje z webu i kasy za zvolené období.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="label text-[11px] text-muted">Období prodejů</span>
          {STOCK_PERIODS.map((p) => (
            <Link key={p.id} href={`/admin/sklad${query({ obdobi: p.id })}`} className={`label inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] ${p.id === period.id ? "border-green bg-green text-cream" : "border-line bg-paper text-green hover:border-green"}`}>
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Hodnota zásob" value={formatPrice(totalValue)} sub={manager && withCost.length > 0 ? `v nákupních cenách ${formatPrice(totalCost)}${withCost.length < all.length ? ` (${all.length - withCost.length} bez nákupní ceny)` : ""}` : `${all.length} evidovaných produktů, v prodejních cenách`} />
        <Stat label={`Prodáno za ${period.label.toLowerCase()}`} value={formatPrice(soldValue)} sub={turnover > 0 ? `obrátka zásob ${turnover.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })}× ročně` : "zatím bez prodeje"} />
        <Stat label="Ležáky" value={String(dead.length)} sub={dead.length ? `${formatPrice(deadValue)} bez prodeje přes ${settings.stock.deadDays} dní` : `nic bez prodeje přes ${settings.stock.deadDays} dní`} warn={dead.length > 0} href={`/admin/sklad${query({ stav: "dead" })}`} />
        <Stat label="Docházející / vyprodané" value={`${low.length} / ${out.length}`} sub={slow.length ? `k tomu ${slow.length} pomalých` : "pomalé: žádné"} warn={low.length + out.length > 0} href={`/admin/sklad${query({ stav: "low" })}`} />
      </div>

      <div className="mt-5">
        <StockFilters
          action="/admin/sklad"
          hidden={{ obdobi: sp.obdobi }}
          search={{ name: "q", value: sp.q, placeholder: "Hledat název" }}
          selects={[
            { name: "rada", value: sp.rada, label: "Řada", options: [{ value: "", label: "Všechny řady" }, ...LINES.map((l) => ({ value: l, label: LINE_INFO[l].name }))] },
            { name: "stav", value: sp.stav, label: "Stav", options: [{ value: "", label: "Všechny stavy" }, ...(Object.keys(STOCK_STATUS_LABEL) as StockStatus[]).map((k) => ({ value: k, label: STOCK_STATUS_LABEL[k] }))] },
            { name: "razeni", value: sp.razeni, label: "Řazení", options: STOCK_SORTS.map((s) => ({ value: s.id, label: `Řadit: ${s.label.toLowerCase()}` })) },
          ]}
        >
          <a href={exportHref} className="label ml-auto text-[11px] text-green underline">
            Export CSV
          </a>
        </StockFilters>
      </div>

      <div className="mt-3">
        {all.length === 0 ? (
          <p className="text-muted">Žádný produkt nemá evidovaný sklad. Množství zapnete u produktu (pole Kusů skladem) nebo první příjemkou.</p>
        ) : (
          <Table head={["Produkt", "Skladem", "Prodáno", "Trend 12 týdnů", "Dní zásoby", "Poslední prodej", "Naskladněno", "Stav", "Hodnota"]}>
            {list.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-muted">
                  Nic neodpovídá filtru.
                </td>
              </tr>
            ) : (
              list.map((s) => (
                <tr key={s.product.id}>
                  <Td>
                    <Link href={`/admin/sklad/${s.product.id}`} className="font-semibold text-green hover:underline">
                      {s.name}
                    </Link>
                    <div className="text-xs text-muted">
                      {LINE_INFO[s.product.line].name} · {STORAGE_LABEL[s.product.storage]}
                      {!s.product.is_published && " · nezveřejněno"}
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap tabular-nums">{formatQty(s.stock, s.product.unit)}</Td>
                  <Td className="whitespace-nowrap tabular-nums">{formatQty(s.sold, s.product.unit)}</Td>
                  <Td>
                    <Sparkline values={s.weekly} title={`Prodeje po týdnech: ${s.weekly.map((v) => formatQty(v, s.product.unit)).join(", ")}`} />
                  </Td>
                  <Td className="whitespace-nowrap tabular-nums">{s.daysOfStock === Infinity ? <span className="text-muted">∞</span> : Math.round(s.daysOfStock)}</Td>
                  <Td className={`whitespace-nowrap ${s.status === "dead" ? "text-brick-text" : ""}`}>{agoLabel(s.daysSinceSale)}</Td>
                  <Td className="whitespace-nowrap text-muted">{agoLabel(s.daysSinceReceipt, "—")}</Td>
                  <Td>
                    <StockStatusBadge status={s.status} />
                  </Td>
                  <Td className="whitespace-nowrap tabular-nums">{formatPrice(s.valueCzk)}</Td>
                </tr>
              ))
            )}
          </Table>
        )}
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
          <span>
            <strong className="font-semibold text-ink">Dní zásoby</strong> = skladem ÷ průměrný denní prodej za období (∞ = bez prodeje)
          </span>
          <span>
            <strong className="font-semibold text-ink">Ležák</strong> = skladem a bez prodeje déle než {settings.stock.deadDays} dní
          </span>
          <span>
            <strong className="font-semibold text-ink">Pomalé</strong> = zásoba na víc než {settings.stock.slowDays} dní
          </span>
          <span>
            <strong className="font-semibold text-ink">Hodnota</strong> = množství × prodejní cena
          </span>
          {untracked > 0 && (
            <span>
              {untracked} {untracked === 1 ? "produkt nemá" : untracked < 5 ? "produkty nemají" : "produktů nemá"} evidované množství a v přehledu není.{" "}
              <Link href="/admin/produkty" className="text-green underline">
                Produkty
              </Link>
            </span>
          )}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, sub, warn, href }: { label: string; value: string; sub?: string; warn?: boolean; href?: string }) {
  const body = (
    <>
      <p className="label text-[11px] text-muted">{label}</p>
      <p className={`font-display text-[24px] font-semibold ${warn ? "text-brick-text" : ""}`}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </>
  );
  const cls = "block rounded-[var(--radius-card)] border border-line bg-paper p-4";
  return href ? (
    <Link href={href} className={`${cls} hover:border-green`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
