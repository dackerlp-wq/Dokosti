import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/admin/status-badge";
import { SubscriptionManage } from "@/components/subscription/manage";
import { formatDate, type OrderRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { subscriptionWeekdays } from "@/lib/shipping";
import { getSubscriptionByToken } from "@/lib/subscriptions";
import { getAuthSupabase } from "@/lib/supabase/auth";

export default async function SubscriptionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getAuthSupabase();
  const [{ data: row }, { data: orders }, settings] = await Promise.all([
    db.from("subscriptions").select("token, customer_id, customer_phone").eq("id", id).maybeSingle(),
    db.from("orders").select("*").eq("subscription_id", id).order("created_at", { ascending: false }).limit(20),
    getSettings(),
  ]);
  if (!row) notFound();
  const sub = await getSubscriptionByToken(db, row.token as string);
  if (!sub) notFound();
  const list = (orders ?? []) as OrderRow[];

  return (
    <>
      <p className="label mb-1 text-[11px] text-muted">
        <Link href="/admin/predplatne" className="hover:underline">
          Předplatné
        </Link>{" "}
        · založeno {formatDate(sub.created_at)}
      </p>
      <h1>{sub.customer_name}</h1>
      <p className="mt-1 text-sm text-muted">
        {row.customer_id ? (
          <Link href={`/admin/zakaznici/${row.customer_id}`} className="text-green hover:underline">
            {sub.customer_email}
          </Link>
        ) : (
          sub.customer_email
        )}{" "}
        · {row.customer_phone as string} ·{" "}
        <Link href={`/predplatne/${sub.token}`} className="text-green hover:underline">
          zákaznický odkaz
        </Link>
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <SubscriptionManage initial={sub} weekdays={subscriptionWeekdays(settings, sub.shipping_method)} settings={settings.subscription} admin />
        <div className="h-fit rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <p className="label mb-2 text-[11px] text-muted">Objednávky z předplatného</p>
          {list.length === 0 ? (
            <p className="text-sm text-muted">Zatím žádná.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {list.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={`/admin/objednavky/${o.id}`} className="font-semibold text-green hover:underline">
                    {o.order_number}
                  </Link>
                  <span className="text-muted">{formatDate(o.created_at)}</span>
                  <span>{formatPrice(o.total_czk)}</span>
                  <StatusBadge status={o.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
