import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/admin/status-badge";
import { Table, Td } from "@/components/admin/table";
import { Button } from "@/components/ui/button";
import { formatDate, SHIPPING_LABEL, type CustomerRow, type LoyaltyRow, type OrderRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase } from "@/lib/supabase/auth";
import { adjustPoints, saveCustomerNote } from "./actions";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getAuthSupabase();
  const [{ data: customer }, { data: orders }, { data: loyalty }] = await Promise.all([
    db.from("customers").select("*").eq("id", id).maybeSingle(),
    db.from("orders").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    db.from("loyalty_transactions").select("id, points, reason, created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(50),
  ]);
  if (!customer) notFound();
  const c = customer as CustomerRow;
  const list = (orders ?? []) as OrderRow[];
  const points = (loyalty ?? []) as LoyaltyRow[];

  return (
    <>
      <p className="label mb-1 text-[11px] text-muted">
        <Link href="/admin/zakaznici" className="hover:underline">
          Zákazníci
        </Link>
      </p>
      <h1>{c.name || c.email}</h1>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4 text-sm">
              <p className="label mb-1 text-[11px] text-muted">Kontakt</p>
              <a href={`mailto:${c.email}`} className="text-green hover:underline">
                {c.email}
              </a>
              <br />
              <a href={`tel:${c.phone}`} className="text-green hover:underline">
                {c.phone}
              </a>
              {c.street && (
                <p className="mt-1 text-muted">
                  {c.street}, {c.zip} {c.city}
                </p>
              )}
            </div>
            <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4 text-sm">
              <p className="label mb-1 text-[11px] text-muted">Nákupy</p>
              <p>
                {c.orders_count} objednávek · {formatPrice(c.total_spent_czk)}
              </p>
              <p className="text-muted">Zákazník od {formatDate(c.created_at)}</p>
              <p className="mt-2 font-display text-[22px] font-semibold">{c.points} Kostiček</p>
            </div>
          </div>

          <h2 className="text-[20px]">Objednávky</h2>
          {list.length === 0 ? (
            <p className="text-muted">Zatím žádné.</p>
          ) : (
            <Table head={["Číslo", "Vytvořeno", "Dodání", "Celkem", "Stav"]}>
              {list.map((o) => (
                <tr key={o.id}>
                  <Td>
                    <Link href={`/admin/objednavky/${o.id}`} className="font-semibold text-green hover:underline">
                      {o.order_number}
                    </Link>
                  </Td>
                  <Td>{formatDate(o.created_at)}</Td>
                  <Td>{SHIPPING_LABEL[o.shipping_method]}</Td>
                  <Td>{formatPrice(o.total_czk)}</Td>
                  <Td>
                    <StatusBadge status={o.status} />
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </div>

        <div className="space-y-4">
        <form action={saveCustomerNote} className="h-fit rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <input type="hidden" name="id" value={c.id} />
          <label htmlFor="note" className="label mb-1 block text-[11px] text-muted">
            Poznámka
          </label>
          <textarea id="note" name="note" rows={6} defaultValue={c.note} placeholder="Jméno psa, alergie, jak se k nim dostat…" />
          <Button type="submit" className="mt-3 w-full">
            Uložit poznámku
          </Button>
        </form>

        <form action={adjustPoints} className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <input type="hidden" name="id" value={c.id} />
          <p className="label mb-2 text-[11px] text-muted">Kostičky ručně</p>
          <div className="grid grid-cols-[100px_1fr] gap-2">
            <input name="points" type="number" placeholder="+50" aria-label="Počet Kostiček, záporné odečte" required />
            <input name="reason" placeholder="Nákup v prodejně" aria-label="Důvod" />
          </div>
          <Button type="submit" variant="secondary" className="mt-2 w-full">
            Připsat / odepsat
          </Button>
          {points.length > 0 && (
            <ul className="mt-3 divide-y divide-line text-xs">
              {points.map((t) => (
                <li key={t.id} className="flex justify-between gap-2 py-1.5">
                  <span className="text-muted">{t.reason}</span>
                  <span className={t.points < 0 ? "text-brick-text" : "text-green"}>
                    {t.points > 0 ? "+" : ""}
                    {t.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </form>
        </div>
      </div>
    </>
  );
}
