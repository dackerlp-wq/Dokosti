import Link from "next/link";
import { StatusBadge } from "@/components/admin/status-badge";
import { Table, Td } from "@/components/admin/table";
import { buttonClass } from "@/components/ui/button";
import { formatDate, formatDay, PAYMENT_LABEL, SHIPPING_LABEL, type OrderItemRow, type OrderRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase } from "@/lib/supabase/auth";
import { setOrderStatus } from "./[id]/actions";

const OPEN = ["nova", "potvrzena", "pripravena"];
const VIEWS = [
  { id: "vyrizeni", label: "K vyřízení" },
  { id: "dnes", label: "Dnes k výdeji a rozvozu" },
  { id: "hotove", label: "Hotové" },
  { id: "vse", label: "Vše" },
] as const;
type View = (typeof VIEWS)[number]["id"];

/** Objednávky podle toho, co s nimi je potřeba udělat, s dalším krokem rovnou v řádku. */
export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ zobrazit?: string; q?: string; stav?: string }> }) {
  const { zobrazit, q, stav } = await searchParams;
  const view: View = (VIEWS.find((v) => v.id === zobrazit)?.id ?? (stav ? "vse" : "vyrizeni")) as View;
  const today = new Date().toISOString().slice(0, 10);
  const db = await getAuthSupabase();

  let query = db.from("orders").select("*").limit(200);
  if (view === "vyrizeni") query = query.in("status", OPEN).order("delivery_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: true });
  else if (view === "dnes") query = query.in("status", OPEN).eq("delivery_date", today).order("shipping_method").order("created_at");
  else if (view === "hotove") query = query.eq("status", "doruceno").order("created_at", { ascending: false });
  else query = query.order("created_at", { ascending: false });
  if (q) query = query.or(`order_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%,customer_email.ilike.%${q}%`);
  const { data } = await query;
  const orders = (data ?? []) as OrderRow[];
  const { data: itemsData } = orders.length ? await db.from("order_items").select("id, order_id, product_slug, name, qty, unit_price_czk").in("order_id", orders.map((o) => o.id)) : { data: [] };
  const itemsByOrder = new Map<string, OrderItemRow[]>();
  for (const i of (itemsData ?? []) as (OrderItemRow & { order_id: string })[]) itemsByOrder.set(i.order_id, [...(itemsByOrder.get(i.order_id) ?? []), i]);

  const { count: openCount } = await db.from("orders").select("id", { count: "exact", head: true }).in("status", OPEN);
  const { count: todayCount } = await db.from("orders").select("id", { count: "exact", head: true }).in("status", OPEN).eq("delivery_date", today);
  const counts: Partial<Record<View, number>> = { vyrizeni: openCount ?? 0, dnes: todayCount ?? 0 };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>Objednávky</h1>
        <div className="flex gap-2">
          <Link href="/admin/rozvoz/stitky" className={buttonClass("secondary")}>
            Tisk štítků
          </Link>
          <Link href="/admin/objednavky/nova" className={buttonClass("primary")}>
            Nová objednávka
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => (
          <Link key={v.id} href={`/admin/objednavky?zobrazit=${v.id}`} className={`label inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] ${view === v.id ? "border-green bg-green text-cream" : "border-line bg-paper text-green hover:border-green"}`}>
            {v.label}
            {counts[v.id] !== undefined && <span className={view === v.id ? "opacity-80" : "text-muted"}>{counts[v.id]}</span>}
          </Link>
        ))}
        <form className="ml-auto flex gap-2">
          <input type="hidden" name="zobrazit" value={view} />
          <input name="q" defaultValue={q} placeholder="Číslo, jméno, telefon" aria-label="Hledat objednávku" className="w-56" />
          <button type="submit" className={buttonClass("secondary")}>
            Hledat
          </button>
        </form>
      </div>

      <div className="mt-4">
        {orders.length === 0 ? (
          <p className="text-muted">{view === "vyrizeni" ? "Nic k vyřízení. Máte hotovo." : view === "dnes" ? "Dnes nic k výdeji ani rozvozu." : "Žádné objednávky."}</p>
        ) : (
          <Table head={["Objednávka", "Zákazník", "Dodání", "Položky", "Celkem", "Stav", ""]}>
            {orders.map((o) => {
              const items = itemsByOrder.get(o.id) ?? [];
              const isToday = o.delivery_date === today && OPEN.includes(o.status);
              return (
                <tr key={o.id} className={isToday ? "bg-cream/60" : ""}>
                  <Td>
                    <Link href={`/admin/objednavky/${o.id}`} className="font-semibold text-green hover:underline">
                      {o.order_number}
                    </Link>
                    <div className="text-xs text-muted">
                      {formatDate(o.created_at)}
                      {o.subscription_id && " · předplatné"}
                      {o.created_by && " · z adminu"}
                    </div>
                  </Td>
                  <Td>
                    {o.customer_name}
                    <div className="text-xs text-muted">
                      <a href={`tel:${o.customer_phone}`} className="hover:underline">
                        {o.customer_phone}
                      </a>
                    </div>
                  </Td>
                  <Td>
                    <span className="font-semibold">{SHIPPING_LABEL[o.shipping_method]}</span>
                    <div className={`text-xs ${isToday ? "font-semibold text-brick-text" : "text-muted"}`}>{o.delivery_date ? (isToday ? "dnes" : formatDay(o.delivery_date)) : o.shipping_method === "rozvoz" ? "bez termínu" : ""}</div>
                  </Td>
                  <Td className="max-w-[260px]">
                    {items.slice(0, 2).map((i) => (
                      <div key={i.id} className="truncate text-sm">
                        {i.qty}× {i.name}
                      </div>
                    ))}
                    {items.length > 2 && <div className="text-xs text-muted">a další {items.length - 2}</div>}
                  </Td>
                  <Td className="whitespace-nowrap">
                    <span className="font-semibold">{formatPrice(o.total_czk)}</span>
                    <div className={`text-xs ${o.paid_at || o.payment_method === "hotove" ? "text-muted" : "text-brick-text"}`}>{o.paid_at ? "zaplaceno" : o.payment_method === "hotove" ? "na místě" : `${PAYMENT_LABEL[o.payment_method].toLowerCase()}, nezaplaceno`}</div>
                  </Td>
                  <Td>
                    <StatusBadge status={o.status} />
                  </Td>
                  <Td className="whitespace-nowrap text-right">
                    <NextStep o={o} />
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </div>
      <p className="mt-3 text-xs text-muted">Tlačítko v řádku posune objednávku o krok dál a zákazníkovi odejde e-mail. Zrušit nebo vrátit stav jde v detailu.</p>
    </>
  );
}

/** Jeden další krok podle stavu a způsobu dodání. */
function NextStep({ o }: { o: OrderRow }) {
  const cls = buttonClass("secondary", "min-h-8 px-3 text-[11px]");
  if (o.status === "nova") return <Step id={o.id} status="potvrzena" label="Potvrdit" />;
  if (o.status === "potvrzena") return <Step id={o.id} status="pripravena" label="Připraveno" />;
  if (o.status === "pripravena" && o.shipping_method === "odber")
    return (
      <Link href="/admin/kasa" className={cls}>
        Vydat u kasy
      </Link>
    );
  if (o.status === "pripravena") return <Step id={o.id} status="doruceno" label={o.shipping_method === "rozvoz" ? "Doručeno" : "Odesláno"} />;
  return null;
}

function Step({ id, status, label }: { id: string; status: string; label: string }) {
  return (
    <form action={setOrderStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={buttonClass("secondary", "min-h-8 px-3 text-[11px]")}>
        {label}
      </button>
    </form>
  );
}
