import type { Metadata } from "next";
import Link from "next/link";
import { OrderStep } from "@/components/admin/order-step";
import { PageHeader } from "@/components/admin/page-header";
import { Pills } from "@/components/admin/stat";
import { StatusBadge } from "@/components/admin/status-badge";
import { Table, Td } from "@/components/admin/table";
import { buttonClass } from "@/components/ui/button";
import { formatDay, PAYMENT_LABEL, type OrderRow } from "@/lib/admin";
import { addDays, addressOf, mapsHref, routeHref, todayIso } from "@/lib/delivery";
import { formatPrice } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Rozvoz a odběry" };

const OPEN = ["nova", "potvrzena", "pripravena"];

/** Plán rozvozu po dnech s navigací a tiskem, k tomu odběry a přepravce. Krok dál přímo v řádku. */
export default async function DeliveryPage({ searchParams }: { searchParams: Promise<{ den?: string }> }) {
  await requireAdmin();
  const { den } = await searchParams;
  const today = todayIso();
  const tomorrow = addDays(today, 1);
  const [db, settings] = await Promise.all([getAuthSupabase(), getSettings()]);
  let rozvozQ = db.from("orders").select("*").eq("shipping_method", "rozvoz").in("status", OPEN).order("delivery_date").order("created_at");
  if (den === "dnes") rozvozQ = rozvozQ.eq("delivery_date", today);
  if (den === "zitra") rozvozQ = rozvozQ.eq("delivery_date", tomorrow);
  const [{ data: rozvoz }, { data: odber }, { data: prepravce }] = await Promise.all([
    rozvozQ,
    db.from("orders").select("*").eq("shipping_method", "odber").in("status", OPEN).order("delivery_date", { ascending: true, nullsFirst: false }).order("created_at"),
    db.from("orders").select("*").eq("shipping_method", "prepravce").in("status", OPEN).order("created_at"),
  ]);

  const byDay = new Map<string, OrderRow[]>();
  for (const o of (rozvoz ?? []) as OrderRow[]) {
    const k = o.delivery_date ?? "bez-terminu";
    byDay.set(k, [...(byDay.get(k) ?? []), o]);
  }
  const origin = [settings.shop.address, settings.shop.city].filter(Boolean).join(", ");

  return (
    <>
      <PageHeader
        title="Rozvoz a odběry"
        subtitle="Otevřené objednávky podle způsobu dodání. Doručené a zrušené se tu neukazují. Tlačítko v řádku posune objednávku dál a zákazníkovi odejde e-mail."
        actions={
          <Link href="/admin/rozvoz/stitky" className={buttonClass("secondary")}>
            Tisk štítků
          </Link>
        }
      />
      <div className="mt-4">
        <Pills
          items={[
            { href: "/admin/rozvoz", label: "Všechny dny", on: !den },
            { href: "/admin/rozvoz?den=dnes", label: "Dnes", on: den === "dnes" },
            { href: "/admin/rozvoz?den=zitra", label: "Zítra", on: den === "zitra" },
          ]}
        />
      </div>

      <h2 className="mt-6 mb-2 text-[20px]">Rozvoz</h2>
      {byDay.size === 0 ? (
        <p className="text-muted">Žádný rozvoz k naplánování.</p>
      ) : (
        [...byDay.entries()].map(([day, list]) => {
          const stops = list.map((o) => addressOf(o)).filter(Boolean);
          const dayLabel = day === "bez-terminu" ? "Bez termínu" : day === today ? `Dnes, ${formatDay(day)}` : day === tomorrow ? `Zítra, ${formatDay(day)}` : formatDay(day);
          const cash = list.filter((o) => o.payment_method === "hotove" && !o.paid_at).reduce((n, o) => n + o.total_czk, 0);
          return (
            <section key={day} className="mb-6">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[16px]">
                  {dayLabel} <span className="font-body text-sm font-normal text-muted">· {list.length} {list.length === 1 ? "zastávka" : list.length < 5 ? "zastávky" : "zastávek"}{cash > 0 ? ` · vybrat ${formatPrice(cash)}` : ""}</span>
                </h3>
                {day !== "bez-terminu" && (
                  <div className="flex flex-wrap gap-2">
                    {stops.length > 0 && origin && (
                      <a href={routeHref(origin, stops)} target="_blank" rel="noopener" className={buttonClass("secondary", "min-h-8 px-3 text-[11px]")}>
                        Navigace celé trasy
                      </a>
                    )}
                    <Link href={`/admin/rozvoz/trasa?den=${day}`} className={buttonClass("secondary", "min-h-8 px-3 text-[11px]")}>
                      Tisk trasy
                    </Link>
                    <Link href={`/admin/rozvoz/stitky?zpusob=rozvoz&den=${day}`} className={buttonClass("secondary", "min-h-8 px-3 text-[11px]")}>
                      Štítky dne
                    </Link>
                  </div>
                )}
              </div>
              <Table head={["#", "Objednávka", "Zákazník", "Adresa", "Platba", "Stav", ""]}>
                {list.map((o, i) => (
                  <Row key={o.id} o={o} index={i + 1} address />
                ))}
              </Table>
              {stops.length > 9 && <p className="mt-1 text-small text-muted">Navigace zvládne nejvýš 10 zastávek, další zadejte zvlášť.</p>}
            </section>
          );
        })
      )}

      <h2 className="mt-8 mb-2 text-[20px]">Osobní odběr</h2>
      {(odber ?? []).length === 0 ? (
        <p className="text-muted">Nic k přípravě.</p>
      ) : (
        <Table head={["#", "Objednávka", "Zákazník", "Vyzvednout", "Platba", "Stav", ""]}>
          {((odber ?? []) as OrderRow[]).map((o, i) => (
            <Row key={o.id} o={o} index={i + 1} pickup />
          ))}
        </Table>
      )}

      <h2 className="mt-8 mb-2 text-[20px]">Přepravce</h2>
      {(prepravce ?? []).length === 0 ? (
        <p className="text-muted">Nic k odeslání.</p>
      ) : (
        <Table head={["#", "Objednávka", "Zákazník", "Adresa", "Platba", "Stav", ""]}>
          {((prepravce ?? []) as OrderRow[]).map((o, i) => (
            <Row key={o.id} o={o} index={i + 1} address />
          ))}
        </Table>
      )}
    </>
  );
}

function Row({ o, index, address, pickup }: { o: OrderRow; index: number; address?: boolean; pickup?: boolean }) {
  const addr = addressOf(o);
  const unpaidTransfer = !o.paid_at && o.payment_method !== "hotove";
  return (
    <tr>
      <Td className="text-muted">{index}</Td>
      <Td>
        <Link href={`/admin/objednavky/${o.id}`} className="font-semibold text-brick-text hover:underline">
          {o.order_number}
        </Link>
        <div className="text-small text-muted">{formatPrice(o.total_czk)}</div>
      </Td>
      <Td>
        {o.customer_name}
        <div className="text-small text-muted">
          <a href={`tel:${o.customer_phone}`} className="hover:underline">
            {o.customer_phone}
          </a>
        </div>
      </Td>
      {address && (
        <Td>
          {addr ? (
            <a href={mapsHref(addr)} target="_blank" rel="noopener" className="hover:underline">
              {addr}
            </a>
          ) : (
            <span className="text-muted">bez adresy</span>
          )}
          {o.note && <div className="text-small italic text-muted">{o.note}</div>}
        </Td>
      )}
      {pickup && <Td>{o.delivery_date ? formatDay(o.delivery_date) : <span className="text-muted">kdykoli</span>}</Td>}
      <Td className={unpaidTransfer ? "text-brick-text" : ""}>
        {o.paid_at ? "zaplaceno" : o.payment_method === "hotove" ? `vybrat ${formatPrice(o.total_czk)}` : `${PAYMENT_LABEL[o.payment_method].toLowerCase()}, nezaplaceno`}
      </Td>
      <Td>
        <StatusBadge status={o.status} />
      </Td>
      <Td className="whitespace-nowrap text-right">
        {o.status === "nova" && <OrderStep id={o.id} status="potvrzena" label="Potvrdit" />}
        {o.status === "potvrzena" && <OrderStep id={o.id} status="pripravena" label="Připraveno" />}
        {o.status === "pripravena" && o.shipping_method === "odber" && (
          <Link href="/admin/kasa?zalozka=vydej" className={buttonClass("secondary", "min-h-8 px-3 text-[11px]")}>
            Vydat u kasy
          </Link>
        )}
        {o.status === "pripravena" && o.shipping_method !== "odber" && <OrderStep id={o.id} status="doruceno" label={o.shipping_method === "rozvoz" ? "Doručeno" : "Odesláno"} variant="primary" />}
      </Td>
    </tr>
  );
}
