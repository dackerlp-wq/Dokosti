import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const metadata: Metadata = { title: "Pokladna" };

export default function CheckoutPage() {
  return (
    <div className="container-dk py-10 md:py-14">
      <h1>Dodání a platba</h1>
      <div className="mt-8">
        <CheckoutForm />
      </div>
    </div>
  );
}
