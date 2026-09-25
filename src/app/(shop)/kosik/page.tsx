import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { getProducts } from "@/lib/products";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Košík" };

export default async function CartPage() {
  const [s, catalog] = await Promise.all([getSettings(), getProducts()]);
  const free = s.shipping.rozvoz.enabled ? s.shipping.rozvoz.freeFromCzk : null;
  return (
    <div className="container-dk py-6 md:py-10">
      <h1>Košík</h1>
      <div className="mt-6">
        <CartView freeDeliveryFromCzk={free} catalog={catalog} />
      </div>
    </div>
  );
}
