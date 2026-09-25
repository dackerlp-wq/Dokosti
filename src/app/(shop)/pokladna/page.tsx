import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getCustomerUser } from "@/lib/customer";
import { getSettings } from "@/lib/settings";
import { getAuthSupabase } from "@/lib/supabase/auth";
import { nextDeliveryDays, paymentMethods, shippingMethods, subscriptionWeekdays } from "@/lib/shipping";

export const metadata: Metadata = { title: "Pokladna" };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ predplatne?: string }> }) {
  const [settings, user, { predplatne }] = await Promise.all([getSettings(), getCustomerUser(), searchParams]);
  let prefill: { name: string; email: string; phone: string; street: string; city: string; zip: string } | undefined;
  if (user) {
    const db = await getAuthSupabase();
    const { data } = await db.from("customers").select("name, phone, street, city, zip").eq("email", user.email).maybeSingle();
    prefill = { email: user.email, name: data?.name ?? "", phone: data?.phone ?? "", street: data?.street ?? "", city: data?.city ?? "", zip: data?.zip ?? "" };
  }
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
          subscription={settings.subscription}
          weekdays={{ odber: subscriptionWeekdays(settings, "odber"), rozvoz: subscriptionWeekdays(settings, "rozvoz"), prepravce: subscriptionWeekdays(settings, "prepravce") }}
          initialInterval={Number(predplatne ?? 0) || 0}
          prefill={prefill}
        />
      </div>
    </div>
  );
}
