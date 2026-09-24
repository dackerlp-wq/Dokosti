import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = { title: "Košík" };

export default function CartPage() {
  return (
    <div className="container-dk py-10 md:py-14">
      <h1>Košík</h1>
      <div className="mt-8">
        <CartView />
      </div>
    </div>
  );
}
