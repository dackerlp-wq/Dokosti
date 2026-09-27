import Link from "next/link";
import { OrderForm, type OrderFormProduct } from "@/components/admin/order-form";
import { productName } from "@/lib/catalog";
import type { LineSlug, ProductUnit } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { nextDeliveryDays, shippingMethods } from "@/lib/shipping";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

/** Objednávka za zákazníka (telefonická). Správce i obsluha. */
export default async function NewOrderPage() {
  const [db, admin, settings] = await Promise.all([getAuthSupabase(), getAdmin(), getSettings()]);
  const { data } = await db.from("products").select("slug, line, variant, unit, price_czk, in_stock, stock_qty, is_published").order("line").order("sort_order").order("variant");
  const products: OrderFormProduct[] = ((data ?? []) as { slug: string; line: LineSlug; variant: string; unit: ProductUnit; price_czk: number; in_stock: boolean; stock_qty: string | number | null; is_published: boolean }[]).map((p) => ({
    slug: p.slug,
    name: productName(p),
    price_czk: p.price_czk,
    unit: p.unit,
    in_stock: p.in_stock,
    stock_qty: p.stock_qty === null ? null : Number(p.stock_qty),
    is_published: p.is_published,
  }));

  return (
    <>
      <p className="label mb-1 text-[11px] text-muted">
        <Link href="/admin/objednavky" className="hover:underline">
          Objednávky
        </Link>
      </p>
      <h1>Nová objednávka</h1>
      <p className="mt-1 text-sm text-muted">Pro zákazníka, který volá nebo stojí u pultu. Vznikne běžná objednávka: jde do rozvozu, k přepravci nebo k výdeji v kase.</p>
      <div className="mt-5">
        <OrderForm
          products={products}
          shipping={shippingMethods(settings)}
          deliveryDays={nextDeliveryDays(settings.shipping.rozvoz.days, 8)}
          loyalty={settings.loyalty}
          manager={admin?.isManager ?? false}
          prevodEnabled={settings.payment.prevod.enabled}
        />
      </div>
    </>
  );
}
