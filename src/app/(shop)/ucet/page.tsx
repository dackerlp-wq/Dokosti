import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDate, formatDay, SHIPPING_LABEL, type CustomerRow, type LoyaltyRow, type OrderRow } from "@/lib/admin";
import { getCustomerUser } from "@/lib/customer";
import { formatPrice } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { getAuthSupabase } from "@/lib/supabase/auth";
import { customerLogout, deletePet, type PetRow } from "./actions";

export const metadata: Metadata = { title: "Můj účet", robots: { index: false } };

export default async function AccountPage() {
  const user = await getCustomerUser();
  if (!user) redirect("/ucet/prihlaseni");
  const db = await getAuthSupabase();
  const [{ data: customer }, { data: orders }, { data: loyalty }, { data: pets }, settings] = await Promise.all([
    db.from("customers").select("*").eq("email", user.email).maybeSingle(),
    db.from("orders").select("*").eq("customer_email", user.email).order("created_at", { ascending: false }).limit(50),
    db.from("loyalty_transactions").select("id, points, reason, created_at").order("created_at", { ascending: false }).limit(20),
    db.from("pets").select("id, name, data, updated_at").order("updated_at", { ascending: false }),
    getSettings(),
  ]);
  const c = customer as CustomerRow | null;
  const list = (orders ?? []) as OrderRow[];
  const points = (loyalty ?? []) as LoyaltyRow[];
  const petList = (pets ?? []) as PetRow[];
  const { loyalty: L } = settings;

  return (
    <div className="container-dk py-6 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1>Můj účet</h1>
          <p className="mt-1 text-sm text-muted">{user.email}</p>
        </div>
        <form action={customerLogout}>
          <button type="submit" className="label text-[11px] text-brick-text hover:underline">
            Odhlásit se
          </button>
        </form>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <p className="label text-[11px] text-muted">Kostičky</p>
          <p className="font-display text-[28px] font-semibold">{c?.points ?? 0}</p>
          {L.enabled && (
            <p className="text-xs text-muted">
              1 za každých {L.czkPerPoint} Kč, {L.redeemStep} = {formatPrice(L.redeemValueCzk)}. Uplatníte v pokladně.
            </p>
          )}
        </div>
        <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <p className="label text-[11px] text-muted">Objednávek</p>
          <p className="font-display text-[28px] font-semibold">{c?.orders_count ?? list.length}</p>
          <p className="text-xs text-muted">celkem {formatPrice(c?.total_spent_czk ?? 0)}</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4 text-sm">
          <p className="label text-[11px] text-muted">Kontakt</p>
          {c ? (
            <>
              <p>{c.name}</p>
              <p className="text-muted">{c.phone}</p>
              {c.street && (
                <p className="text-muted">
                  {c.street}, {c.zip} {c.city}
                </p>
              )}
              <p className="mt-1 text-xs text-muted">Údaje se berou z poslední objednávky.</p>
            </>
          ) : (
            <p className="text-muted">Zatím žádná objednávka. Údaje se předvyplní po první.</p>
          )}
        </div>
      </div>

      <h2 className="mt-8 mb-3 text-[22px]">Objednávky</h2>
      {list.length === 0 ? (
        <p className="text-muted">
          Zatím žádné.{" "}
          <Link href="/rada/zaklad" className="text-green underline">
            Vybrat krmivo
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper">
          {list.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
              <div>
                <Link href={`/ucet/objednavky/${o.id}`} className="font-semibold text-green hover:underline">
                  {o.order_number}
                </Link>
                <span className="text-muted">
                  {" "}
                  · {formatDate(o.created_at)} · {SHIPPING_LABEL[o.shipping_method]}
                  {o.delivery_date && ` ${formatDay(o.delivery_date)}`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display font-semibold">{formatPrice(o.total_czk)}</span>
                <StatusBadge status={o.status} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 mb-3 text-[22px]">Moje zvířata</h2>
      {petList.length === 0 ? (
        <p className="text-muted">
          Zatím žádný profil. Spočítejte dávku v{" "}
          <Link href="/kalkulacka" className="text-green underline">
            kalkulačce
          </Link>{" "}
          a uložte ji k účtu.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper text-sm">
          {petList.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <span>
                <strong>{p.name}</strong>
                <span className="text-muted">
                  {" "}
                  · {p.data.species === "kocka" ? "kočka" : "pes"}, {String(p.data.weightKg ?? "?")} kg · {formatDate(p.updated_at)}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <Link href="/kalkulacka" className="text-green underline">
                  Přepočítat
                </Link>
                <form action={deletePet}>
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className="text-xs text-brick-text hover:underline">
                    Smazat
                  </button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      )}

      {points.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 text-[22px]">Historie Kostiček</h2>
          <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper text-sm">
            {points.map((t) => (
              <li key={t.id} className="flex justify-between gap-3 p-3">
                <span className="text-muted">
                  {formatDate(t.created_at)} · {t.reason}
                </span>
                <span className={t.points < 0 ? "text-brick-text" : "text-green"}>
                  {t.points > 0 ? "+" : ""}
                  {t.points}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
