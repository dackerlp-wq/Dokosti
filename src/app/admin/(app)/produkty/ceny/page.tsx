import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { PriceTool, type PriceProduct } from "@/components/admin/price-tool";
import type { ProductRow } from "@/lib/admin";
import { LINE_INFO, productName } from "@/lib/catalog";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Hromadná změna cen" };

export default async function PricesPage() {
  await requireManager();
  const db = await getAuthSupabase();
  const [{ data }, { data: suppliers }] = await Promise.all([db.from("products").select("id, line, variant, price_czk, purchase_price_czk, supplier_id, original_price_czk").order("line").order("sort_order").order("variant"), db.from("suppliers").select("id, name").order("name")]);
  const products: PriceProduct[] = ((data ?? []) as Pick<ProductRow, "id" | "line" | "variant" | "price_czk" | "purchase_price_czk" | "supplier_id" | "original_price_czk">[]).map((p) => ({ id: p.id, name: productName(p), line: p.line, lineName: LINE_INFO[p.line].name, price_czk: p.price_czk, purchase_price_czk: p.purchase_price_czk, supplier_id: p.supplier_id, inAction: !!p.original_price_czk }));
  return (
    <>
      <PageHeader crumbs={[{ href: "/admin/produkty", label: "Produkty" }]} title="Hromadná změna cen" subtitle="Vyberte, kterých produktů se změna týká, zvolte pravidlo a před zapsáním zkontrolujte náhled s marží. Změna se zapíše do deníku s důvodem." />
      <div className="mt-5">
        <PriceTool products={products} suppliers={(suppliers ?? []) as { id: string; name: string }[]} />
      </div>
    </>
  );
}
