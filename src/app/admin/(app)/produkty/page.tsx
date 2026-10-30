import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { StockFilters } from "@/components/admin/stock-filters";
import { Table, Td } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { formatMarginCzk, formatQty, marginOf, type ProductRow, type SupplierRow } from "@/lib/admin";
import { LINE_INFO, LINES, productName, STORAGE_LABEL } from "@/lib/catalog";
import { formatPrice, formatWeight } from "@/lib/format";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Produkty" };

const STATES: { id: string; label: string; test: (p: ProductRow) => boolean }[] = [
  { id: "web", label: "Na webu", test: (p) => p.is_published },
  { id: "skryte", label: "Skryté", test: (p) => !p.is_published },
  { id: "neni", label: "Není skladem", test: (p) => !p.in_stock },
  { id: "akce", label: "V akci", test: (p) => !!p.original_price_czk },
  { id: "bezfotky", label: "Bez fotky", test: (p) => !p.image_url },
  { id: "bezean", label: "Bez EAN", test: (p) => !p.ean },
  { id: "bezdodavatele", label: "Bez dodavatele", test: (p) => !p.supplier_id },
];

/** Katalog produktů s hledáním a filtry. Ceny hromadně, cenovky k tisku, nový produkt průvodcem. */
export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; rada?: string; stav?: string; dodavatel?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const manager = admin.isManager;
  const db = await getAuthSupabase();
  const [{ data }, { data: suppliers }] = await Promise.all([db.from("products").select("*").order("line").order("sort_order").order("variant"), db.from("suppliers").select("id, name").order("name")]);
  const all = (data ?? []) as ProductRow[];
  const sups = (suppliers ?? []) as Pick<SupplierRow, "id" | "name">[];
  const supName = new Map(sups.map((s) => [s.id, s.name]));
  const q = (sp.q ?? "").trim().toLowerCase();
  const state = STATES.find((s) => s.id === sp.stav);
  const products = all.filter((p) => (!sp.rada || p.line === sp.rada) && (!sp.dodavatel || p.supplier_id === sp.dodavatel) && (!state || state.test(p)) && (!q || `${productName(p)} ${p.slug} ${p.ean ?? ""} ${p.producer}`.toLowerCase().includes(q)));
  /** Marže v Kč (a %) z prodejní ceny a velkoobchodní nákupní ceny s DPH. Pod 20 % cihlově. */
  const marginCell = (price: number, p: ProductRow) => {
    const m = marginOf(price, p.purchase_price_czk);
    if (!m) return <span className="text-muted">—</span>;
    return (
      <span className={m.pct < 20 ? "text-brick-text" : ""}>
        <span className="font-semibold">{formatMarginCzk(m.czk)}</span>
        <span className="block text-small text-muted">{m.pct} %</span>
      </span>
    );
  };

  return (
    <>
      <PageHeader
        title="Produkty"
        subtitle={`${all.length} produktů · ${all.filter((p) => p.is_published).length} na webu`}
        actions={
          <>
            {manager && (
              <Link href="/admin/produkty/ceny" className={buttonClass("secondary")}>
                Hromadná změna cen
              </Link>
            )}
            <Link href={`/admin/produkty/cenovky${sp.rada ? `?rada=${sp.rada}` : ""}`} className={buttonClass("secondary")}>
              Cenovky
            </Link>
            <Link href="/admin/produkty/novy" className={buttonClass("primary")}>
              Nový produkt
            </Link>
          </>
        }
      />
      <div className="mt-4">
        <StockFilters
          action="/admin/produkty"
          search={{ name: "q", value: sp.q, placeholder: "Název, EAN, výrobce" }}
          selects={[
            { name: "rada", value: sp.rada, label: "Řada", options: [{ value: "", label: "Všechny řady" }, ...LINES.map((l) => ({ value: l, label: LINE_INFO[l].name }))] },
            { name: "stav", value: sp.stav, label: "Stav", options: [{ value: "", label: "Všechny stavy" }, ...STATES.map((s) => ({ value: s.id, label: s.label }))] },
            ...(sups.length ? [{ name: "dodavatel", value: sp.dodavatel, label: "Dodavatel", options: [{ value: "", label: "Všichni dodavatelé" }, ...sups.map((s) => ({ value: s.id, label: s.name }))] }] : []),
          ]}
        />
      </div>
      <div className="mt-4">
        {products.length === 0 ? (
          <p className="text-muted">{all.length === 0 ? "Zatím žádný produkt. Založte první tlačítkem Nový produkt." : "Nic neodpovídá filtru."}</p>
        ) : (
          <Table head={manager ? ["Název", "Řada", "Balení", "Nákup", "Cena", "Marže", "Sklad", "Dodavatel", "Stav"] : ["Název", "Řada", "Balení", "Cena", "Sklad", "Dodavatel", "Stav"]}>
            {products.map((p) => (
              <tr key={p.id}>
                <Td>
                  <Link href={`/admin/produkty/${p.id}`} className="font-semibold text-brick-text hover:underline">
                    {productName(p)}
                  </Link>
                  {p.ean && <div className="text-small text-muted">{p.ean}</div>}
                </Td>
                <Td>{LINE_INFO[p.line].name}</Td>
                <Td>{p.unit === "kg" ? <span className="text-muted">na váhu</span> : formatWeight(p.weight_grams)}</Td>
                {manager && (
                  <Td className="whitespace-nowrap">
                    {p.purchase_price_czk !== null ? formatMarginCzk(Number(p.purchase_price_czk)) : <span className="text-muted">—</span>}
                    {p.purchase_price_czk !== null && p.unit === "kg" && <span className="text-muted">/kg</span>}
                  </Td>
                )}
                <Td className="whitespace-nowrap">
                  {formatPrice(p.price_czk)}
                  {p.unit === "kg" && <span className="text-muted">/kg</span>}
                  {p.original_price_czk && <span className="ml-1 text-muted line-through">{formatPrice(p.original_price_czk)}</span>}
                  {p.store_price_czk !== null && p.store_price_czk !== p.price_czk && <div className="text-small text-muted">prodejna {formatPrice(p.store_price_czk)}</div>}
                </Td>
                {manager && <Td className="whitespace-nowrap">{marginCell(p.price_czk, p)}</Td>}
                <Td>
                  {p.stock_qty === null ? (
                    <span className="text-muted">{STORAGE_LABEL[p.storage]}</span>
                  ) : (
                    <Link href={`/admin/sklad/${p.id}`} className={`hover:underline ${Number(p.stock_qty) <= p.low_stock_threshold ? "font-semibold text-brick-text" : ""}`}>
                      {formatQty(p.stock_qty, p.unit)}
                    </Link>
                  )}
                </Td>
                <Td className="text-muted">{p.supplier_id ? supName.get(p.supplier_id) ?? "—" : "—"}</Td>
                <Td>
                  <span className="flex flex-wrap gap-1">
                    {p.is_published ? <Badge kind="skladem">Na webu</Badge> : <Badge>Skryté</Badge>}
                    {!p.in_stock && <Badge kind="sleva">Není</Badge>}
                    {p.is_new && <Badge kind="novinka">Novinka</Badge>}
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}
