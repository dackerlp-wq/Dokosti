import type { Metadata } from "next";
import { CheckoutForm, type PlanHandoff } from "@/components/checkout/checkout-form";
import { productName } from "@/lib/catalog";
import { getProducts } from "@/lib/products";
import { PageIntro } from "@/components/ui/page-intro";
import { getCustomerUser } from "@/lib/customer";
import { getSettings } from "@/lib/settings";
import { getAuthSupabase } from "@/lib/supabase/auth";
import { nextDeliveryDays, paymentMethods, shippingMethods, subscriptionWeekdays } from "@/lib/shipping";

export const metadata: Metadata = { title: "Pokladna" };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ predplatne?: string; dodani?: string; obcas?: string; jednou?: string; a?: string; b?: string; davka?: string; nahled?: string }> }) {
  const [settings, user, products, { predplatne, dodani, obcas, jednou, a, b, davka, nahled }] = await Promise.all([getSettings(), getCustomerUser(), getProducts(), searchParams]);
  const pairs = (v?: string) => (v ?? "").split(",").map((p) => p.split(":")).filter(([slug, n]) => slug && Number.isInteger(Number(n)) && Number(n) >= 1 && Number(n) <= 99) as [string, string][];
  // Z průvodce Krmení na míru: jednorázové doplňky, střídání masa a denní dávka (plán předává v adrese).
  const plan: PlanHandoff | undefined =
    jednou !== undefined || b !== undefined || davka !== undefined
      ? {
          once: Object.fromEntries(pairs(jednou).filter(([, n]) => Number(n) <= 12).map(([slug, n]) => [slug, Number(n)])),
          aOnly: (a ?? "").split(",").filter(Boolean),
          b: pairs(b).flatMap(([slug, n]) => {
            const p = products.find((x) => x.slug === slug);
            return p ? [{ slug, qty: Number(n), name: productName(p) }] : [];
          }),
          dailyGrams: Number(davka) > 0 && Number(davka) < 10000 ? Math.round(Number(davka)) : undefined,
          preview: nahled !== "0",
        }
      : undefined;
  let prefill: { name: string; email: string; phone: string; street: string; city: string; zip: string } | undefined;
  if (user) {
    const db = await getAuthSupabase();
    const { data } = await db.from("customers").select("name, phone, street, city, zip").or(`user_id.eq.${user.id},email.eq.${user.email}`).limit(1).maybeSingle();
    prefill = { email: user.email, name: data?.name ?? "", phone: data?.phone ?? "", street: data?.street ?? "", city: data?.city ?? "", zip: data?.zip ?? "" };
  }
  return (
    <>
      <PageIntro title="Pokladna">
        <p>Tři kroky: doprava, platba a vaše údaje. Mražené zboží posíláme tak, aby dorazilo mražené.</p>
      </PageIntro>
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
          plan={plan}
          prefill={prefill}
        />
      </div>
    </>
  );
}
