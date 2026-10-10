import type { Metadata } from "next";
import { InventoryWizard, type InventoryProduct } from "@/components/admin/inventory-wizard";
import { PageHeader } from "@/components/admin/page-header";
import type { ProductRow } from "@/lib/admin";
import { LINE_INFO, productName } from "@/lib/catalog";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Inventura" };

export default async function InventoryPage() {
  await requireAdmin();
  const db = await getAuthSupabase();
  const { data } = await db.from("products").select("id, line, variant, unit, stock_qty, price_czk, ean").not("stock_qty", "is", null).order("line").order("sort_order").order("variant");
  const products: InventoryProduct[] = ((data ?? []) as Pick<ProductRow, "id" | "line" | "variant" | "unit" | "stock_qty" | "price_czk" | "ean">[]).map((p) => ({ id: p.id, name: productName(p), line: p.line, lineName: LINE_INFO[p.line].name, unit: p.unit, stock: Number(p.stock_qty), price_czk: p.price_czk, ean: p.ean }));
  return (
    <>
      <PageHeader crumbs={[{ href: "/admin/sklad", label: "Sklad" }]} title="Inventura" subtitle="Projděte řadu po řadě a zapište skutečný stav. Rozpracovanou inventuru si prohlížeč pamatuje, zapíše se až po kontrole rozdílů." />
      <div className="mt-5">{products.length === 0 ? <p className="text-muted">Žádný produkt nemá evidované množství.</p> : <InventoryWizard products={products} />}</div>
    </>
  );
}
