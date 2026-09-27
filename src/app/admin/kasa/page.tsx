import { Pos } from "@/components/pos/pos";
import type { PosProduct } from "@/lib/pos";
import { czAccountToIban } from "@/lib/pos";
import { getSettings } from "@/lib/settings";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";
import { posPickupOrders, posShiftSummary } from "./actions";

export const dynamic = "force-dynamic";

export default async function PosPage() {
  const [db, admin, settings] = await Promise.all([getAuthSupabase(), getAdmin(), getSettings()]);
  const [{ data: products }, shift, pickup] = await Promise.all([
    db.from("products").select("id, slug, line, variant, unit, price_czk, weight_grams, ean, stock_qty, in_stock, is_published").order("line").order("sort_order").order("variant"),
    posShiftSummary(),
    posPickupOrders(),
  ]);
  const list = ((products ?? []) as PosProduct[]).map((p) => ({ ...p, stock_qty: p.stock_qty === null ? null : Number(p.stock_qty) }));
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
    />
  );
}
