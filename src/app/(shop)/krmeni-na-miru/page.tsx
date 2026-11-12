import type { Metadata } from "next";
import { FeedingCalculator } from "@/components/plan/feeding-calculator";
import type { PetDbRow } from "@/lib/admin";
import { type PetProfile, rowToProfile } from "@/lib/club";
import { getCustomerUser } from "@/lib/customer";
import { getProducts } from "@/lib/products";
import { SITE_URL } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { getAuthSupabase } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "Krmení na míru: kolik krmit a co koupit pro psa nebo kočku",
  description: "Čtyři otázky, denní dávka podle FEDIAF a balíček syrového masa s cenou za den. Pravidelné dodávky zrušíte kdykoli.",
  alternates: { canonical: `${SITE_URL}/krmeni-na-miru` },
};

/** Krmení na míru: čtyři kroky → denní dávka a balíček s cenou za den → pravidelné dodávky. Přihlášenému nabídne uložené mazlíčky. */
export default async function FeedingPlanPage() {
  const [products, settings, user] = await Promise.all([getProducts(), getSettings(), getCustomerUser()]);
  let pets: PetProfile[] = [];
  if (user) {
    const db = await getAuthSupabase();
    const { data } = await db.from("pets").select("*").order("updated_at", { ascending: false });
    pets = ((data ?? []) as PetDbRow[]).map(rowToProfile);
  }
  return <FeedingCalculator products={products} subscription={settings.subscription} user={user ? { email: user.email } : null} pets={pets} />;
}
