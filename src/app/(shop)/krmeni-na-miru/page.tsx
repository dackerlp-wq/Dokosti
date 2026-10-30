import type { Metadata } from "next";
import { PlanWizard } from "@/components/plan/plan-wizard";
import type { MeatKey } from "@/lib/barf";
import { MEATS } from "@/lib/catalog";
import { type PetProfile, rowToProfile } from "@/lib/club";
import { getCustomerUser } from "@/lib/customer";
import { meatIllustration } from "@/lib/menu";
import { getProducts } from "@/lib/products";
import { SITE_URL } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { getAuthSupabase } from "@/lib/supabase/auth";
import type { PetDbRow } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Krmení na míru: plán pro vašeho psa nebo kočku",
  description: "Sedm otázek, plán syrové stravy s cenou za den a pravidelné dodávky, které kdykoli změníte. Bez závazku.",
  alternates: { canonical: `${SITE_URL}/krmeni-na-miru` },
};

/** Průvodce „Krmení na míru“: otázky o zvířeti → plán s cenou za den → předplatné. */
export default async function PlanWizardPage() {
  const [products, settings, user] = await Promise.all([getProducts(), getSettings(), getCustomerUser()]);
  let account: { email: string; name: string } | null = null;
  let pets: PetProfile[] = [];
  if (user) {
    const db = await getAuthSupabase();
    const [{ data: c }, { data: rows }] = await Promise.all([db.from("customers").select("name").eq("user_id", user.id).maybeSingle(), db.from("pets").select("*").order("updated_at", { ascending: false })]);
    account = { email: user.email, name: c?.name ?? "" };
    pets = ((rows ?? []) as PetDbRow[]).map(rowToProfile);
  }
  const meatImages: Partial<Record<MeatKey, string>> = {};
  for (const m of MEATS) {
    const img = meatIllustration(m);
    if (img) meatImages[m] = img;
  }
  const s = settings.shipping;

  return (
    <>
      <header className="mx-auto flex max-w-site flex-wrap items-end justify-between gap-x-5 gap-y-2 px-5 pt-7.5 pb-7.5 md:pt-10">
        <div>
          <p className="text-eyebrow text-muted uppercase">Krmení na míru</p>
          <h1 className="font-display text-display-md text-green md:text-display-lg">Plán pro vašeho psa nebo kočku</h1>
        </div>
        <p className="text-small">Sedm otázek, zhruba 2 minuty · nic se neukládá, dokud plán nedokončíte</p>
      </header>
      <PlanWizard
        products={products}
        club={settings.club}
        subscription={settings.subscription}
        loyalty={settings.loyalty}
        shipping={{ rozvoz: s.rozvoz.enabled, odber: s.odber.enabled, freeFromCzk: s.rozvoz.freeFromCzk, rozvozPriceCzk: s.rozvoz.priceCzk }}
        user={account}
        pets={pets}
        meatImages={meatImages}
      />
    </>
  );
}
