import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { PurchaseOrderForm, type PurchaseProduct, type SupplierOption } from "@/components/admin/purchase-order-form";
import { getSettings } from "@/lib/settings";
import { stockPeriod, suggestedOrderQty } from "@/lib/stock-analysis";
import { loadStockStats } from "@/lib/stock-data";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Nová objednávka u dodavatele" };

export default async function NewPurchaseOrderPage({ searchParams }: { searchParams: Promise<{ dodavatel?: string }> }) {
  const admin = await requireAdmin();
  const { dodavatel } = await searchParams;
  const [db, settings] = await Promise.all([getAuthSupabase(), getSettings()]);
  const period = stockPeriod("90");
  const [{ data: suppliers }, { stats }, { data: untracked }] = await Promise.all([
    db.from("suppliers").select("id, name, email, lead_days, min_order_czk").eq("active", true).order("name"),
    loadStockStats(db, period.days, settings.stock),
    db.from("products").select("id, line, variant, unit, supplier_id, purchase_price_czk, pack_size").is("stock_qty", null),
  ]);
  const products: PurchaseProduct[] = [
    ...stats.map((s) => ({ id: s.product.id, name: s.name, unit: s.product.unit, supplier_id: s.product.supplier_id ?? null, purchase_price_czk: admin.isManager ? s.product.purchase_price_czk : null, stock: s.stock, suggested: suggestedOrderQty(s, period.days, settings.stock), status: s.status, pack_size: s.product.pack_size ?? null })),
    ...((untracked ?? []) as { id: string; line: string; variant: string; unit: "ks" | "kg"; supplier_id: string | null; purchase_price_czk: number | null; pack_size: number | null }[]).map((p) => ({ id: p.id, name: p.variant.charAt(0).toUpperCase() + p.variant.slice(1), unit: p.unit, supplier_id: p.supplier_id, purchase_price_czk: admin.isManager ? p.purchase_price_czk : null, stock: null, suggested: 0, status: "ok", pack_size: p.pack_size })),
  ].sort((a, b) => a.name.localeCompare(b.name, "cs"));
  const list = (suppliers ?? []) as SupplierOption[];

  return (
    <>
      <PageHeader crumbs={[{ href: "/admin/nakup", label: "Objednávky u dodavatelů" }]} title="Nová objednávka u dodavatele" subtitle="Vyberte dodavatele, zkontrolujte navržené položky a uložte návrh. Odeslání potvrdíte zvlášť." />
      <div className="mt-5">
        {list.length === 0 ? (
          <p className="text-muted">
            Nejdřív založte dodavatele v{" "}
            <Link href="/admin/dodavatele" className="text-green underline">
              Dodavatelích
            </Link>
            .
          </p>
        ) : (
          <PurchaseOrderForm products={products} suppliers={list} initialSupplier={dodavatel ?? ""} manager={admin.isManager} reorderDays={settings.stock.reorderDays} today={new Date().toISOString().slice(0, 10)} />
        )}
      </div>
    </>
  );
}
