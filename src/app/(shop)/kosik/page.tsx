import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { PageIntro } from "@/components/ui/page-intro";
import { getProducts } from "@/lib/products";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Košík" };

export default async function CartPage() {
  const [s, catalog] = await Promise.all([getSettings(), getProducts()]);
  const free = s.shipping.rozvoz.enabled ? s.shipping.rozvoz.freeFromCzk : null;
  return (
    <>
      <PageIntro title="Košík" />
      <div className="mx-auto max-w-site px-5 pb-10 md:pb-15">
        <CartView freeDeliveryFromCzk={free} catalog={catalog} />
      </div>
    </>
  );
}
