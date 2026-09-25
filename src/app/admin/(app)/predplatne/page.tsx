import type { Metadata } from "next";
import Link from "next/link";
import { Table, Td } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { formatDay, SHIPPING_LABEL } from "@/lib/admin";
import { DAY_NAMES_SHORT } from "@/lib/settings";
import { INTERVAL_LABEL } from "@/lib/shipping";
import { SUBSCRIPTION_STATUS_LABEL, type SubscriptionStatus } from "@/lib/subscriptions";
import { getAuthSupabase } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Předplatné" };

type Row = {
  id: string;
  customer_name: string;
  customer_email: string;
  shipping_method: "odber" | "rozvoz" | "prepravce";
  interval_days: number;
  weekday: number;
  next_date: string;
  skip_next: boolean;
  status: SubscriptionStatus;
  last_error: string | null;
  created_at: string;
  subscription_items: { qty: number }[];
};

const KIND: Record<SubscriptionStatus, "skladem" | "sleva" | "neutral"> = { aktivni: "skladem", pozastaveno: "sleva", zruseno: "neutral" };

export default async function SubscriptionsPage() {
  const db = await getAuthSupabase();
  const { data } = await db
    .from("subscriptions")
    .select("id, customer_name, customer_email, shipping_method, interval_days, weekday, next_date, skip_next, status, last_error, created_at, subscription_items(qty)")
    .order("status")
    .order("next_date");
  const rows = (data ?? []) as Row[];
  const active = rows.filter((r) => r.status === "aktivni");
  const other = rows.filter((r) => r.status !== "aktivni");

  return (
    <>
      <h1>Předplatné</h1>
      <p className="mt-1 text-sm text-muted">
        Pravidelné odběry zákazníků. Objednávky vznikají samy před dodávkou a objeví se v Objednávkách i v plánu rozvozu. Nastavení slevy a
        lhůt je v Nastavení → Předplatné.
      </p>

      <h2 className="mt-6 mb-2 text-[20px]">Aktivní ({active.length})</h2>
      {active.length === 0 ? <p className="text-muted">Zatím žádné.</p> : <List rows={active} />}

      {other.length > 0 && (
        <>
          <h2 className="mt-8 mb-2 text-[20px]">Pozastavená a zrušená</h2>
          <List rows={other} />
        </>
      )}
    </>
  );
}

function List({ rows }: { rows: Row[] }) {
  return (
    <Table head={["Zákazník", "Dodání", "Interval", "Další dodávka", "Položek", "Stav"]}>
      {rows.map((r) => (
        <tr key={r.id}>
          <Td>
            <Link href={`/admin/predplatne/${r.id}`} className="font-semibold text-green hover:underline">
              {r.customer_name}
            </Link>
            <br />
            <span className="text-xs text-muted">{r.customer_email}</span>
          </Td>
          <Td>{SHIPPING_LABEL[r.shipping_method]}</Td>
          <Td>
            {INTERVAL_LABEL[r.interval_days]} · {DAY_NAMES_SHORT[r.weekday]}
          </Td>
          <Td>
            {r.status === "aktivni" ? formatDay(r.next_date) : "—"}
            {r.skip_next && <span className="ml-1 text-xs text-brick-text">přeskočí</span>}
          </Td>
          <Td>{r.subscription_items.reduce((n, i) => n + i.qty, 0)} ks</Td>
          <Td>
            <Badge kind={KIND[r.status]}>{SUBSCRIPTION_STATUS_LABEL[r.status]}</Badge>
            {r.last_error && <span className="ml-1 text-xs text-brick-text">{r.last_error}</span>}
          </Td>
        </tr>
      ))}
    </Table>
  );
}
