import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/admin/status-badge";
import { PetEditor, PetRowEditable } from "@/components/account/pet-editor";
import { ProfileForm } from "@/components/account/profile-form";
import { formatDate, formatDay, SHIPPING_LABEL, type CustomerRow, type LoyaltyRow, type OrderRow, type PetDbRow } from "@/lib/admin";
import { MEAT_LABEL, type Activity, type Condition, type MeatKey } from "@/lib/barf";
import { type FeedingNow, type PetProfile, petSummary } from "@/lib/club";
import { getCustomerUser } from "@/lib/customer";
import { formatPrice } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { INTERVAL_LABEL } from "@/lib/shipping";
import { SUBSCRIPTION_STATUS_LABEL, type SubscriptionStatus } from "@/lib/subscriptions";
import { getAuthSupabase } from "@/lib/supabase/auth";
import { customerLogout, deletePet } from "./actions";

export const metadata: Metadata = { title: "Můj účet", robots: { index: false } };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ vitejte?: string }> }) {
  const [user, { vitejte }] = await Promise.all([getCustomerUser(), searchParams]);
  if (!user) redirect("/ucet/prihlaseni");
  const db = await getAuthSupabase();
  // Rozpracovaná registrace (po potvrzení e-mailu) se dokončí při prvním otevření účtu.
  const { data: completed } = await db.rpc("club_complete_registration");
  const justDone = (completed as { done?: boolean; awarded?: number } | null) ?? null;
  const [{ data: customer }, { data: orders }, { data: loyalty }, { data: pets }, { data: subs }, settings] = await Promise.all([
    db.from("customers").select("*").or(`user_id.eq.${user.id},email.eq.${user.email}`).limit(1).maybeSingle(),
    db.from("orders").select("*").order("created_at", { ascending: false }).limit(50),
    db.from("loyalty_transactions").select("id, points, reason, created_at").order("created_at", { ascending: false }).limit(20),
    db.from("pets").select("*").order("updated_at", { ascending: false }),
    db.from("subscriptions").select("id, token, interval_days, next_date, status, skip_next").eq("customer_email", user.email).order("created_at", { ascending: false }),
    getSettings(),
  ]);
  const c = customer as CustomerRow | null;
  const list = (orders ?? []) as OrderRow[];
  const points = (loyalty ?? []) as LoyaltyRow[];
  const petList = (pets ?? []) as PetDbRow[];
  const toProfile = (p: PetDbRow): PetProfile => ({
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
  });
  const subList = (subs ?? []) as { id: string; token: string; interval_days: number; next_date: string; status: SubscriptionStatus; skip_next: boolean }[];
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

      {!c && !justDone?.done && (
        <div className="mt-5 rounded-[var(--radius-card)] border border-green bg-paper p-4">
          <p className="label text-brick-text">Dokončete registraci do klubu</p>
          <p className="mt-1 text-sm">
            Účet máte, ale ještě není v klubu DoKosti. Doplňte telefon, případně kartu z prodejny a profil zvířete
            {settings.club.registrationPoints > 0 ? ` a získáte ${settings.club.registrationPoints} Kostiček` : ""}.
          </p>
          <Link href="/registrace" className="label mt-3 inline-flex min-h-10 items-center rounded-[var(--radius-control)] bg-green px-4 text-cream">
            Dokončit registraci
          </Link>
        </div>
      )}
      {(vitejte === "1" || justDone?.done) && (
        <div className="mt-5 rounded-[var(--radius-card)] border border-green bg-paper p-4">
          <p className="label text-brick-text">Vítejte v klubu</p>
          <p className="mt-1 text-sm">
            Účet je propojený s Kostičkami{c?.card_code ? " i s vaší kartou" : ""}.
            {justDone?.awarded ? ` Připsali jsme ${justDone.awarded} Kostiček.` : ""} Kartu z prodejny přiřadíme při prvním načtení u pultu.
          </p>
        </div>
      )}

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
              {c.card_code && <p className="mt-1 text-xs text-muted">Karta {c.card_code}</p>}
              <a href="#profil" className="mt-1 inline-block text-xs text-green underline">
                Upravit údaje a souhlasy
              </a>
            </>
          ) : (
            <p className="text-muted">Zatím žádné údaje. Doplní se po první objednávce.</p>
          )}
        </div>
      </div>

      <h2 className="mt-8 mb-3 text-[22px]">Objednávky</h2>
      {list.length === 0 ? (
        <p className="text-muted">
          Zatím žádné.{" "}
          <Link href="/rada/barf" className="text-green underline">
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

      {subList.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 text-[22px]">Pravidelný odběr</h2>
          <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper text-sm">
            {subList.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span>
                  <strong>{INTERVAL_LABEL[s.interval_days]}</strong>
                  <span className="text-muted">
                    {" "}
                    · {s.status === "aktivni" ? `další ${formatDay(s.next_date)}${s.skip_next ? " (přeskočíme)" : ""}` : SUBSCRIPTION_STATUS_LABEL[s.status].toLowerCase()}
                  </span>
                </span>
                <Link href={`/predplatne/${s.token}`} className="text-green underline">
                  Spravovat
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mt-8 mb-3 text-[22px]">Moje zvířata</h2>
      <p className="mb-3 text-sm text-muted">
        Z profilu počítáme denní dávku a doporučujeme krmivo.
        {settings.club.petPoints > 0 && ` Za úplný profil (jméno, váha, datum narození) připíšeme ${settings.club.petPoints} Kostiček, nejvýš za ${settings.club.petPointsMax} zvířata.`}
      </p>
      {petList.length > 0 && (
        <ul className="mb-3 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper">
          {petList.map((p) => (
            <PetRowEditable
              key={p.id}
              id={p.id}
              pet={toProfile(p)}
              summary={petSummary(p, MEAT_LABEL)}
              petPoints={settings.club.petPoints}
              deleteAction={
                <form action={deletePet}>
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className="text-xs text-brick-text hover:underline">
                    Smazat
                  </button>
                </form>
              }
            />
          ))}
        </ul>
      )}
      <PetEditor petPoints={settings.club.petPoints} />

      {c && (
        <>
          <h2 id="profil" className="mt-8 mb-3 scroll-mt-4 text-[22px]">Moje údaje a souhlasy</h2>
          <ProfileForm c={c} />
        </>
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
