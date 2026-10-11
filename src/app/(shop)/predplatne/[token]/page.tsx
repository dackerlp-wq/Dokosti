import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SubscriptionManage } from "@/components/subscription/manage";
import { PageIntro } from "@/components/ui/page-intro";
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
    <>
      <PageIntro eyebrow="Pravidelný odběr" title={`Dobrý den, ${sub.customer_name.split(" ")[0]}.`}>
        <p>Tady si dodávky přeskočíte, upravíte nebo zrušíte. Odkaz na tuto stránku je jen váš.</p>
      </PageIntro>
      <div className="mx-auto max-w-narrow px-5 pb-10 md:pb-15">
        <SubscriptionManage initial={sub} weekdays={subscriptionWeekdays(settings, sub.shipping_method)} settings={settings.subscription} />
      </div>
    </>
  );
}
