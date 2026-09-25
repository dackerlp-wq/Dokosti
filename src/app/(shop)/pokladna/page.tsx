import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getSettings } from "@/lib/settings";
import { nextDeliveryDays, paymentMethods, shippingMethods } from "@/lib/shipping";

export const metadata: Metadata = { title: "Pokladna" };

export default async function CheckoutPage() {
  const settings = await getSettings();
  return (
    <div className="container-dk py-6 md:py-10">
      <h1>Dodání a platba</h1>
      <div className="mt-6">
        <CheckoutForm
          shipping={shippingMethods(settings)}
          payment={paymentMethods(settings)}
          deliveryDays={nextDeliveryDays(settings.shipping.rozvoz.days)}
          deliveryWindow={settings.shipping.rozvoz.window}
          loyalty={settings.loyalty}
        />
      </div>
    </div>
  );
}
