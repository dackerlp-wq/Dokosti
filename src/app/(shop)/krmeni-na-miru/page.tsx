import type { Metadata } from "next";
import { FeedingCalculator } from "@/components/plan/feeding-calculator";
import { getProducts } from "@/lib/products";
import { SITE_URL } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Krmení na míru: kolik krmit a co koupit pro psa nebo kočku",
  description: "Čtyři otázky, denní dávka podle FEDIAF a balíček syrového masa s cenou za den. Pravidelné dodávky zrušíte kdykoli.",
  alternates: { canonical: `${SITE_URL}/krmeni-na-miru` },
};

/** Krmení na míru: čtyři kroky → denní dávka a balíček s cenou za den → pravidelné dodávky. */
export default async function FeedingPlanPage() {
  const [products, settings] = await Promise.all([getProducts(), getSettings()]);
  return <FeedingCalculator products={products} subscription={settings.subscription} />;
}
