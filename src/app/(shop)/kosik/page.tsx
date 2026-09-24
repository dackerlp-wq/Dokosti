import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Košík" };

export default async function CartPage() {
  const s = await getSettings();
  const free = s.shipping.rozvoz.enabled ? s.shipping.rozvoz.freeFromCzk : null;
  return (
    <div className="container-dk py-6 md:py-10">
      <h1>Košík</h1>
      <div className="mt-6">
        <CartView freeDeliveryFromCzk={free} />
      </div>
    </div>
  );
}
