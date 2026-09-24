import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export const metadata: Metadata = { title: "Pokladna" };

export default function CheckoutPage() {
  return (
    <div className="container-dk py-6 md:py-10">
      <h1>Dodání a platba</h1>
      <div className="mt-6">
        <CheckoutForm />
      </div>
    </div>
  );
}
