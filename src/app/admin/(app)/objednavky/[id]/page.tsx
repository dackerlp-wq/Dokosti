import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Table, Td } from "@/components/admin/table";
import { Button, buttonClass } from "@/components/ui/button";
import { formatDate, formatDay, ORDER_STATUS_LABEL, ORDER_STATUSES, PAYMENT_LABEL, SHIPPING_LABEL, type OrderItemRow, type OrderRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { activityFor } from "@/lib/activity";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";
import { issueInvoice, saveOrderNote, sendPaymentReminder, setOrderPaid, setOrderStatus } from "./actions";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const db = await getAuthSupabase();
  const [{ data: order }, { data: items }, history, { data: emails }] = await Promise.all([
    db.from("orders").select("*").eq("id", id).maybeSingle(),
    db.from("order_items").select("*").eq("order_id", id),
    activityFor(db, "order", id),
    db.from("email_log").select("id, subject, status, created_at").eq("order_id", id).order("created_at", { ascending: false }).limit(10),
  ]);
  if (!order) notFound();
  const o = order as OrderRow & { internal_note?: string };
  const lines = (items ?? []) as OrderItemRow[];
  const mails = (emails ?? []) as { id: string; subject: string; status: string; created_at: string }[];

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/admin/objednavky", label: "Objednávky" }, { label: formatDate(o.created_at) }]}
        title={o.order_number}
        badges={
          <>
            <StatusBadge status={o.status} />
            {o.paid_at && <span className="label rounded-[var(--radius-control)] bg-green px-2 py-1 text-[10px] text-cream">Zaplaceno</span>}
            {o.created_by && <span className="label text-[10px] text-muted">založeno v adminu</span>}
          </>
        }
        actions={
          <>
            <Link href={`/admin/rozvoz/stitky?objednavka=${o.id}`} className={buttonClass("secondary")}>
              Štítek
            </Link>
            {o.customer_id && (
              <Link href={`/admin/objednavky/nova?zakaznik=${o.customer_id}`} className={buttonClass("secondary")}>
                Nová objednávka pro zákazníka
              </Link>
            )}
          </>
        }
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Table head={["Položka", "Ks", "Cena", "Celkem"]}>
            {lines.map((i) => (
              <tr key={i.id}>
                <Td>{i.name}</Td>
                <Td>{i.qty}</Td>
                <Td>{formatPrice(i.unit_price_czk)}</Td>
                <Td>{formatPrice(i.qty * i.unit_price_czk)}</Td>
              </tr>
            ))}
            {o.discount_czk > 0 && (
              <tr>
                <Td className="text-brick-text">Sleva{o.coupon_code ? ` · kód ${o.coupon_code}` : ""}{o.discount_note ? ` · ${o.discount_note}` : ""}</Td>
                <Td>{""}</Td>
                <Td>{""}</Td>
                <Td className="text-brick-text">−{formatPrice(o.discount_czk)}</Td>
              </tr>
            )}
            {o.points_discount_czk > 0 && (
              <tr>
                <Td className="text-brick-text">Kostičky · {o.points_redeemed} uplatněno</Td>
                <Td>{""}</Td>
                <Td>{""}</Td>
                <Td className="text-brick-text">−{formatPrice(o.points_discount_czk)}</Td>
              </tr>
            )}
            <tr>
              <Td className="text-muted">Doprava · {SHIPPING_LABEL[o.shipping_method]}</Td>
              <Td>{""}</Td>
              <Td>{""}</Td>
              <Td>{o.shipping_czk === 0 ? "zdarma" : formatPrice(o.shipping_czk)}</Td>
            </tr>
            <tr className="font-semibold">
              <Td>Celkem</Td>
              <Td>{""}</Td>
              <Td>{""}</Td>
              <Td>{formatPrice(o.total_czk)}</Td>
            </tr>
          </Table>

          <div className="grid gap-4 sm:grid-cols-2">
            <Box title="Zákazník">
              {o.customer_id ? (
                <Link href={`/admin/zakaznici/${o.customer_id}`} className="font-semibold text-green hover:underline">
                  {o.customer_name}
                </Link>
              ) : (
                o.customer_name
              )}
              <br />
              <a href={`tel:${o.customer_phone}`} className="text-green hover:underline">
                {o.customer_phone}
              </a>
              <br />
              <a href={`mailto:${o.customer_email}`} className="text-green hover:underline">
                {o.customer_email}
              </a>
            </Box>
            <Box title="Dodání a platba">
              {SHIPPING_LABEL[o.shipping_method]}
              {o.delivery_date && <> · {formatDay(o.delivery_date)}</>} · {PAYMENT_LABEL[o.payment_method]}
              {o.paid_at ? ` · zaplaceno ${formatDate(o.paid_at)}` : ""}
              {o.street && (
                <>
                  <br />
                  {o.street}, {o.zip} {o.city}
                </>
              )}
            </Box>
            {o.note && (
              <Box title="Poznámka zákazníka" className="sm:col-span-2">
                {o.note}
              </Box>
            )}
          </div>
        </div>

        <div className="space-y-4">
        <form action={setOrderStatus} className="h-fit rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <input type="hidden" name="id" value={o.id} />
          <label htmlFor="status" className="label mb-1 block text-[11px] text-muted">
            Stav objednávky
          </label>
          <select id="status" name="status" defaultValue={o.status}>
            {ORDER_STATUSES.filter((s) => s !== "zrusena" || o.status === "zrusena").map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" name="notify" value="on" defaultChecked className="h-4 w-4 min-h-0 w-auto accent-green" />
            Poslat zákazníkovi e-mail
          </label>
          <input type="hidden" name="notify" value="off" />
          <Button type="submit" className="mt-3 w-full">
            Uložit stav
          </Button>
          {o.points_earned > 0 && (
            <p className="mt-3 text-xs text-muted">Po označení „Doručeno“ se zákazníkovi připíše {o.points_earned} Kostiček.</p>
          )}
          {o.status !== "zrusena" && o.status !== "doruceno" && (
            <div className="mt-3 border-t border-line pt-3">
              <ConfirmButton
                action={setOrderStatus}
                fields={{ id: o.id, status: "zrusena" }}
                title={`Zrušit objednávku ${o.order_number}?`}
                text="Zboží se vrátí na sklad, uplatněné Kostičky zákazníkovi zpět a zákazníkovi odejde e-mail o zrušení. Krok nejde vzít zpět."
                confirmLabel="Zrušit objednávku"
                reasonName="reason"
                reasonLabel="Důvod (do deníku, zákazník ho neuvidí)"
                variant="ghost"
                className="w-full"
              >
                Zrušit objednávku
              </ConfirmButton>
            </div>
          )}
        </form>

        <form action={setOrderPaid} className="h-fit rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <input type="hidden" name="id" value={o.id} />
          <input type="hidden" name="paid" value={o.paid_at ? "0" : "1"} />
          <p className="label mb-1 text-[11px] text-muted">Platba</p>
          <p className="text-sm">{o.paid_at ? `Zaplaceno ${formatDate(o.paid_at)}` : `Nezaplaceno · ${PAYMENT_LABEL[o.payment_method]}`}</p>
          {o.paid_at ? (
            <ConfirmButton action={setOrderPaid} fields={{ id: o.id, paid: "0" }} title="Zrušit označení zaplaceno?" text="Objednávka se zase bude hlídat jako nezaplacená a po třech dnech se objeví mezi upozorněními." confirmLabel="Zrušit označení" variant="secondary" className="mt-3 w-full">
              Zrušit označení zaplaceno
            </ConfirmButton>
          ) : (
            <Button type="submit" variant="secondary" className="mt-3 w-full">
              Označit jako zaplaceno
            </Button>
          )}
        </form>
        {!o.paid_at && o.payment_method === "prevod" && o.status !== "zrusena" && (
          <form action={sendPaymentReminder} className="h-fit rounded-[var(--radius-card)] border border-line bg-paper p-4">
            <input type="hidden" name="id" value={o.id} />
            <p className="label mb-1 text-[11px] text-muted">Připomínka platby</p>
            <p className="text-sm text-muted">E-mail s číslem účtu, částkou a variabilním symbolem{o.customer_email ? ` na ${o.customer_email}` : " (zákazník nemá e-mail)"}.</p>
            <Button type="submit" variant="secondary" className="mt-3 w-full" disabled={!o.customer_email}>
              Poslat připomínku
            </Button>
          </form>
        )}

        <div className="h-fit rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <p className="label mb-1 text-[11px] text-muted">Doklad</p>
          {o.invoice_number ? (
            <>
              <p className="text-sm">
                Č. {o.invoice_number}
                {o.invoice_issued_at && <span className="text-muted"> · {formatDate(o.invoice_issued_at)}</span>}
              </p>
              <Link href={`/admin/objednavky/${o.id}/doklad`} className={buttonClass("secondary", "mt-3 w-full")}>
                Zobrazit a tisknout
              </Link>
            </>
          ) : (
            <ConfirmButton action={issueInvoice} fields={{ id: o.id }} title="Vystavit doklad?" text="Doklad dostane číslo z číselné řady a nejde ho vzít zpět. Vystavujte až s konečnými položkami a částkou." confirmLabel="Vystavit doklad" variant="secondary" className="w-full">
              Vystavit doklad
            </ConfirmButton>
          )}
        </div>

        <form action={saveOrderNote} className="h-fit rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <input type="hidden" name="id" value={o.id} />
          <label htmlFor="internal_note" className="label mb-1 block text-[11px] text-muted">
            Interní poznámka (zákazník nevidí)
          </label>
          <textarea id="internal_note" name="internal_note" rows={3} defaultValue={o.internal_note ?? ""} placeholder="např. volala, chce odeslat až v úterý" />
          <Button type="submit" variant="secondary" className="mt-2 w-full">
            Uložit poznámku
          </Button>
        </form>

        <div className="h-fit rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <p className="label mb-1 text-[11px] text-muted">Historie</p>
          <ul className="space-y-2 text-sm">
            <li>
              <span className="font-semibold">Objednávka přijata</span>
              <span className="block text-xs text-muted">
                {formatDate(o.created_at)} · {o.created_by ? "založena v adminu" : o.subscription_id ? "z předplatného" : "z webu"}
              </span>
            </li>
            {history
              .slice()
              .reverse()
              .map((h) => (
                <li key={h.id}>
                  <span className="font-semibold">{h.text}</span>
                  <span className="block text-xs text-muted">
                    {formatDate(h.created_at)} · {h.actor_name}
                  </span>
                </li>
              ))}
          </ul>
          {mails.length > 0 && (
            <>
              <p className="label mt-3 mb-1 text-[11px] text-muted">E-maily zákazníkovi</p>
              <ul className="space-y-1 text-sm">
                {mails.map((m) => (
                  <li key={m.id} className="flex justify-between gap-2">
                    <Link href={`/admin/emaily/${m.id}`} className="min-w-0 truncate hover:underline">
                      {m.subject}
                    </Link>
                    <span className="shrink-0 text-xs text-muted">{m.status === "odeslano" ? "odesláno" : m.status === "chyba" ? "chyba" : "čeká"}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        </div>
      </div>
    </>
  );
}

function Box({ title, className = "", children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-[var(--radius-card)] border border-line bg-paper p-4 text-sm ${className}`}>
      <p className="label mb-1 text-[11px] text-muted">{title}</p>
      {children}
    </div>
  );
}
