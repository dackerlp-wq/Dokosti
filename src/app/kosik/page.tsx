import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = { title: "Košík" };

export default function CartPage() {
  return (
    <div className="container-dk py-6 md:py-10">
      <h1>Košík</h1>
      <div className="mt-6">
        <CartView />
      </div>
    </div>
  );
}
