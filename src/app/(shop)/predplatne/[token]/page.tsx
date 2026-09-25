import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SubscriptionManage } from "@/components/subscription/manage";
import { getSettings } from "@/lib/settings";
import { subscriptionWeekdays } from "@/lib/shipping";
import { getSubscriptionByToken } from "@/lib/subscriptions";
import { getSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pravidelný odběr", robots: { index: false, follow: false } };

export default async function SubscriptionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getSupabase();
  if (!db) notFound();
  const [sub, settings] = await Promise.all([getSubscriptionByToken(db, token), getSettings()]);
  if (!sub) notFound();

  return (
    <div className="container-dk max-w-3xl py-6 md:py-10">
      <p className="label mb-2 text-brick-text">Pravidelný odběr</p>
      <h1>Dobrý den, {sub.customer_name.split(" ")[0]}.</h1>
      <p className="mt-2 text-muted">Tady si dodávky přeskočíte, upravíte nebo zrušíte. Odkaz na tuto stránku je jen váš.</p>
      <div className="mt-6">
        <SubscriptionManage initial={sub} weekdays={subscriptionWeekdays(settings, sub.shipping_method)} settings={settings.subscription} />
      </div>
    </div>
  );
}
