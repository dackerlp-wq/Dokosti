import type { Metadata } from "next";
import { PlanWizard } from "@/components/plan/plan-wizard";
import { type Activity, type Condition, type MeatKey } from "@/lib/barf";
import { MEATS } from "@/lib/catalog";
import { type FeedingNow, type PetProfile } from "@/lib/club";
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
    pets = ((rows ?? []) as PetDbRow[]).map((p) => ({
      id: p.id,
      species: p.species === "kocka" ? "kocka" : "pes",
      name: p.name,
      breed: p.breed ?? "",
      bornOn: p.born_on ?? "",
      weightKg: Number(p.weight_kg ?? (p.data as { weightKg?: number }).weightKg ?? 0),
      neutered: p.neutered ?? true,
      activity: (p.activity as Activity) ?? "bezna",
      condition: (p.condition as Condition) ?? "idealni",
      feedingNow: (p.feeding_now as FeedingNow) ?? "",
      currentFood: p.current_food ?? "",
      exclude: (p.exclude ?? []) as MeatKey[],
      note: p.note ?? "",
    }));
  }
  const meatImages: Partial<Record<MeatKey, string>> = {};
  for (const m of MEATS) {
    const img = meatIllustration(m);
    if (img) meatImages[m] = img;
  }
  const s = settings.shipping;

  return (
    <div className="container-dk py-6 md:py-10">
      <div className="mx-auto mb-6 max-w-xl text-center">
        <p className="label text-brick-text">Krmení na míru</p>
        <h1 className="mt-1">Plán pro vašeho psa nebo kočku</h1>
        <p className="mt-2 text-muted">Sedm otázek, dvě minuty. Dostanete denní dávku, složení dodávky a cenu za den. Pošleme pravidelně, nebo jen jednou.</p>
      </div>
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
    </div>
  );
}
