import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/admin/status-badge";
import { Table, Td } from "@/components/admin/table";
import { Button } from "@/components/ui/button";
import { formatDate, SHIPPING_LABEL, type CustomerRow, type LoyaltyRow, type OrderRow, type PetDbRow } from "@/lib/admin";
import { MEAT_LABEL } from "@/lib/barf";
import { FEEDING_LABEL, type FeedingNow, petSummary } from "@/lib/club";
import { code128Svg, newCardCode } from "@/lib/barcode";
import { formatPrice } from "@/lib/format";
import { POS_PAYMENT_LABEL, type PosSaleRow } from "@/lib/pos";
import { getAuthSupabase } from "@/lib/supabase/auth";
import { adjustPoints, saveCardCode, saveCustomerNote } from "./actions";

export default async function CustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ karta?: string }> }) {
  const [{ id }, { karta }] = await Promise.all([params, searchParams]);
  const db = await getAuthSupabase();
  const [{ data: customer }, { data: orders }, { data: loyalty }, { data: sales }, { data: pets }] = await Promise.all([
    db.from("customers").select("*").eq("id", id).maybeSingle(),
    db.from("orders").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    db.from("loyalty_transactions").select("id, points, reason, created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(50),
    db.from("pos_sales").select("*").eq("customer_id", id).is("order_id", null).order("created_at", { ascending: false }).limit(50),
    db.from("pets").select("*").eq("customer_id", id).order("updated_at", { ascending: false }),
  ]);
  const petList = (pets ?? []) as PetDbRow[];
  if (!customer) notFound();
  const c = customer as CustomerRow;
  const list = (orders ?? []) as OrderRow[];
  const points = (loyalty ?? []) as LoyaltyRow[];
  const pos = (sales ?? []) as PosSaleRow[];
  const barcode = c.card_code ? code128Svg(c.card_code) : null;

  return (
    <>
      <p className="label mb-1 text-[11px] text-muted">
        <Link href="/admin/zakaznici" className="hover:underline">
          Zákazníci
        </Link>
      </p>
      <h1>{c.name || c.email || "Zákazník bez jména"}</h1>

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
            <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4 text-sm sm:col-span-2">
              <p className="label mb-1 text-[11px] text-muted">Klub</p>
              <p>
                {c.user_id ? `Účet registrovaný ${c.registered_at ? formatDate(c.registered_at) : ""}` : "Bez účtu"} · zdroj {c.source}
                {c.heard_from ? ` · ví o nás z: ${c.heard_from}` : ""}
              </p>
              <p className="text-muted">
                Newsletter e-mailem: {c.consent_marketing_email_at ? `ano (${formatDate(c.consent_marketing_email_at)})` : "ne"} · SMS: {c.consent_marketing_sms_at ? "ano" : "ne"}
                {c.terms_accepted_at ? ` · podmínky ${formatDate(c.terms_accepted_at)}` : ""}
              </p>
            </div>
          </div>

          <h2 className="text-[20px]">Zvířata</h2>
          {petList.length === 0 ? (
            <p className="text-muted">Zatím žádná.</p>
          ) : (
            <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper text-sm">
              {petList.map((p) => (
                <li key={p.id} className="p-3">
                  <strong>{p.name}</strong> <span className="text-muted">· {petSummary(p, MEAT_LABEL)}</span>
                  <p className="text-xs text-muted">
                    {[p.breed, p.feeding_now ? FEEDING_LABEL[p.feeding_now as Exclude<FeedingNow, "">] : "", p.current_food, p.note].filter(Boolean).join(" · ") || "bez dalších údajů"}
                    {p.rewarded_at ? " · odměněno" : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}

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

          <h2 className="text-[20px]">Nákupy v prodejně</h2>
          {pos.length === 0 ? (
            <p className="text-muted">Zatím žádné.</p>
          ) : (
            <Table head={["Účtenka", "Datum", "Platba", "Celkem", "Stav"]}>
              {pos.map((s) => (
                <tr key={s.id}>
                  <Td>
                    <a href={`/admin/kasa/uctenka/${s.id}`} target="_blank" rel="noopener" className="font-semibold text-green hover:underline">
                      {s.number}
                    </a>
                  </Td>
                  <Td>{formatDate(s.created_at)}</Td>
                  <Td>{POS_PAYMENT_LABEL[s.payment]}</Td>
                  <Td className={s.status === "storno" ? "line-through text-muted" : ""}>{formatPrice(s.total_czk)}</Td>
                  <Td>{s.status === "storno" ? <span className="label text-[10px] text-brick-text">storno</span> : <span className="label text-[10px] text-green">zaplaceno</span>}</Td>
                </tr>
              ))}
            </Table>
          )}
        </div>

        <div className="space-y-4">
        <form action={saveCardCode} className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <input type="hidden" name="id" value={c.id} />
          <p className="label mb-2 text-[11px] text-muted">Zákaznická karta</p>
          {barcode ? (
            <div className="mb-3 overflow-x-auto rounded-[var(--radius-control)] border border-line bg-white p-2" dangerouslySetInnerHTML={{ __html: barcode }} />
          ) : (
            <p className="mb-3 text-sm text-muted">Bez karty. Kartu přiřadí kasa při prvním načtení, nebo zapište kód zde.</p>
          )}
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input name="card_code" defaultValue={c.card_code ?? ""} placeholder={newCardCode()} aria-label="Kód karty" className="uppercase" />
            <Button type="submit" variant="secondary">
              Uložit
            </Button>
          </div>
          {karta === "obsazena" && <p className="mt-2 text-sm text-brick-text">Tento kód už má jiný zákazník.</p>}
          <p className="mt-2 text-xs text-muted">Kód z čárového kódu na kartě (Code 128). Prázdné pole kartu odebere. Tisk štítku: pravým tlačítkem na kód → uložit obrázek.</p>
        </form>

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
