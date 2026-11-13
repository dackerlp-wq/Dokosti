import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import Image from "next/image";
import { getCustomerUser } from "@/lib/customer";
import { getSettings } from "@/lib/settings";
import { getAuthSupabase } from "@/lib/supabase/auth";
import { nextDeliveryDays, paymentMethods, shippingMethods, subscriptionWeekdays } from "@/lib/shipping";

export const metadata: Metadata = { title: "Pokladna" };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ predplatne?: string; dodani?: string; obcas?: string }> }) {
  const [settings, user, { predplatne, dodani, obcas }] = await Promise.all([getSettings(), getCustomerUser(), searchParams]);
  let prefill: { name: string; email: string; phone: string; street: string; city: string; zip: string } | undefined;
  if (user) {
    const db = await getAuthSupabase();
    const { data } = await db.from("customers").select("name, phone, street, city, zip").or(`user_id.eq.${user.id},email.eq.${user.email}`).limit(1).maybeSingle();
    prefill = { email: user.email, name: data?.name ?? "", phone: data?.phone ?? "", street: data?.street ?? "", city: data?.city ?? "", zip: data?.zip ?? "" };
  }
  return (
    <>
      <div className="bg-gradient-to-b from-cream to-paper">
        <header className="mx-auto flex max-w-site items-end gap-3.5 px-5 pt-7 pb-5 md:pt-10">
          <Image src="/maskot/vendy-pozdrav.webp" alt="" width={115} height={190} className="-mb-1.5 hidden h-21 w-auto sm:block" aria-hidden priority />
          <div>
            <p className="text-eyebrow text-muted uppercase">Pokladna</p>
            <h1 className="font-display text-display-md text-green">Dokončení objednávky</h1>
          </div>
        </header>
      </div>
      <div className="mx-auto max-w-site px-5 pb-10 md:pb-15">
        <CheckoutForm
          shipping={shippingMethods(settings)}
          payment={paymentMethods(settings)}
          deliveryDays={nextDeliveryDays(settings.shipping.rozvoz.days)}
          deliveryWindow={settings.shipping.rozvoz.window}
          loyalty={settings.loyalty}
          subscription={settings.subscription}
          weekdays={{ odber: subscriptionWeekdays(settings, "odber"), rozvoz: subscriptionWeekdays(settings, "rozvoz"), prepravce: subscriptionWeekdays(settings, "prepravce") }}
          initialInterval={Number(predplatne ?? 0) || 0}
          initialShipping={dodani === "rozvoz" || dodani === "odber" || dodani === "prepravce" ? dodani : undefined}
          everyNth={Object.fromEntries((obcas ?? "").split(",").map((p) => p.split(":")).filter(([slug, n]) => slug && Number(n) >= 2 && Number(n) <= 12).map(([slug, n]) => [slug, Number(n)]))}
          prefill={prefill}
          accountEmail={user?.email ?? null}
        />
      </div>
    </>
  );
}
