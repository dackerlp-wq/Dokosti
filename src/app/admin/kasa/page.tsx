import { Pos } from "@/components/pos/pos";
import type { PosProduct } from "@/lib/pos";
import { czAccountToIban, storePrice } from "@/lib/pos";
import { getSettings } from "@/lib/settings";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";
import { posPickupOrders, posShiftSummary } from "./actions";

export const dynamic = "force-dynamic";

export default async function PosPage({ searchParams }: { searchParams: Promise<{ zalozka?: string }> }) {
  const { zalozka } = await searchParams;
  const [db, admin, settings] = await Promise.all([getAuthSupabase(), getAdmin(), getSettings()]);
  const [{ data: products }, shift, pickup] = await Promise.all([
    db.from("products").select("id, slug, line, variant, unit, price_czk, original_price_czk, store_price_czk, weight_grams, ean, stock_qty, in_stock, is_published").order("line").order("sort_order").order("variant"),
    posShiftSummary(),
    posPickupOrders(),
  ]);
  type Row = Omit<PosProduct, "price_czk"> & { price_czk: number; original_price_czk: number | null; store_price_czk: number | null };
  const list: PosProduct[] = ((products ?? []) as Row[]).map(({ original_price_czk, store_price_czk, ...p }) => ({
    ...p,
    price_czk: storePrice({ price_czk: p.price_czk, original_price_czk, store_price_czk }),
    stock_qty: p.stock_qty === null ? null : Number(p.stock_qty),
  }));
  const iban = settings.payment.prevod.bankAccount ? czAccountToIban(settings.payment.prevod.bankAccount) : null;

  return (
    <Pos
      products={list}
      manager={admin?.isManager ?? false}
      userId={admin?.id ?? ""}
      userEmail={admin?.email ?? ""}
      loyalty={settings.loyalty}
      pos={settings.pos}
      shopName={settings.shop.name}
      iban={iban}
      initialShift={shift}
      initialPickup={pickup}
      initialTab={zalozka === "vydej" || zalozka === "uzaverka" || zalozka === "dnes" ? zalozka : "prodej"}
    />
  );
}
