import { notFound } from "next/navigation";
import { PrintButton } from "@/components/admin/print-button";
import { formatDay, PAYMENT_LABEL, SHIPPING_LABEL, type OrderItemRow, type OrderRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { getAuthSupabase } from "@/lib/supabase/auth";

const dateFmt = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium" });

/** Doklad k objednávce. Neplátce DPH: doklad bez DPH. Plátce: doklad s rozpisem (sazba podle produktu zatím jednotná 12 %). */
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getAuthSupabase();
  const [{ data: order }, { data: items }, settings] = await Promise.all([
    db.from("orders").select("*").eq("id", id).maybeSingle(),
    db.from("order_items").select("*").eq("order_id", id),
    getSettings(),
  ]);
  if (!order) notFound();
  const o = order as OrderRow;
  const lines = (items ?? []) as OrderItemRow[];
  const shop = settings.shop;
  const vat = shop.vatPayer;
  const VAT_RATE = 12;
  const discount = o.discount_czk + o.points_discount_czk;
  const base = vat ? Math.round(o.total_czk / (1 + VAT_RATE / 100)) : o.total_czk;
  const issued = o.invoice_issued_at ? new Date(o.invoice_issued_at) : new Date(o.created_at);

  return (
    <div className="mx-auto max-w-[720px] print:max-w-none">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <p className="text-sm text-muted">Doklad se vytiskne bez menu. Uložit jako PDF jde v dialogu tisku.</p>
        <PrintButton />
      </div>

      <article className="rounded-[var(--radius-card)] border border-line bg-white p-8 text-[13px] leading-snug text-ink print:border-0 print:p-0">
        <header className="flex items-start justify-between gap-6 border-b border-line pb-4">
          <div>
            <p className="font-display text-[26px] font-bold text-green">DoKosti</p>
            <p className="label text-[10px] text-muted">BARF · krmivo pro psy a kočky</p>
          </div>
          <div className="text-right">
            <p className="font-display text-[20px] font-semibold">{vat ? "Faktura – daňový doklad" : "Doklad o prodeji"}</p>
            <p className="text-[15px]">č. {o.invoice_number ?? "—"}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-6 py-4">
          <div>
            <p className="label mb-1 text-[10px] text-muted">Dodavatel</p>
            <p className="font-semibold">{shop.name}</p>
            <p>
              {shop.address}
              <br />
              {shop.city}
            </p>
            <p>IČO {shop.ico}{vat && shop.dic ? ` · DIČ ${shop.dic}` : ""}</p>
            <p className="text-muted">{vat ? "Plátce DPH" : "Neplátce DPH"}</p>
          </div>
          <div>
            <p className="label mb-1 text-[10px] text-muted">Odběratel</p>
            <p className="font-semibold">{o.customer_name}</p>
            {o.street && (
              <p>
                {o.street}
                <br />
                {o.zip} {o.city}
              </p>
            )}
            <p className="text-muted">{o.customer_email}</p>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-4 border-y border-line py-3 text-[12px]">
          <p>
            <span className="text-muted">Datum vystavení</span>
            <br />
            {dateFmt.format(issued)}
          </p>
          <p>
            <span className="text-muted">Objednávka</span>
            <br />
            {o.order_number}
            {o.delivery_date && ` · ${formatDay(o.delivery_date)}`}
          </p>
          <p>
            <span className="text-muted">Způsob úhrady</span>
            <br />
            {PAYMENT_LABEL[o.payment_method]}
            {o.payment_method === "prevod" && settings.payment.prevod.bankAccount && (
              <>
                <br />
                {settings.payment.prevod.bankAccount}, VS {o.order_number.replace(/\D/g, "")}
              </>
            )}
          </p>
        </section>

        <table className="mt-4 w-full">
          <thead>
            <tr className="label text-left text-[10px] text-muted">
              <th className="py-1 font-semibold">Položka</th>
              <th className="py-1 text-right font-semibold">Množství</th>
              <th className="py-1 text-right font-semibold">Cena / ks</th>
              <th className="py-1 text-right font-semibold">Celkem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lines.map((i) => (
              <tr key={i.id}>
                <td className="py-1.5">{i.name}</td>
                <td className="py-1.5 text-right">{i.qty} ks</td>
                <td className="py-1.5 text-right">{formatPrice(i.unit_price_czk)}</td>
                <td className="py-1.5 text-right">{formatPrice(i.qty * i.unit_price_czk)}</td>
              </tr>
            ))}
            <tr>
              <td className="py-1.5" colSpan={3}>
                Doprava · {SHIPPING_LABEL[o.shipping_method]}
              </td>
              <td className="py-1.5 text-right">{o.shipping_czk === 0 ? "0 Kč" : formatPrice(o.shipping_czk)}</td>
            </tr>
            {discount > 0 && (
              <tr>
                <td className="py-1.5" colSpan={3}>
                  Sleva{o.coupon_code ? ` (${o.coupon_code})` : ""}
                  {o.points_discount_czk > 0 ? " a Kostičky" : ""}
                </td>
                <td className="py-1.5 text-right">−{formatPrice(discount)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <section className="mt-4 ml-auto w-64 space-y-1 border-t border-line pt-3">
          {vat && (
            <>
              <p className="flex justify-between text-muted">
                <span>Základ daně</span>
                <span>{formatPrice(base)}</span>
              </p>
              <p className="flex justify-between text-muted">
                <span>DPH {VAT_RATE} %</span>
                <span>{formatPrice(o.total_czk - base)}</span>
              </p>
            </>
          )}
          <p className="flex justify-between font-display text-[18px] font-semibold">
            <span>Celkem k úhradě</span>
            <span>{formatPrice(o.total_czk)}</span>
          </p>
        </section>

        <footer className="mt-8 border-t border-line pt-3 text-[11px] text-muted">
          {shop.name} · {shop.phone} · {shop.email}
          {!vat && " · Dodavatel není plátcem DPH."}
          <span className="float-right font-display">Poctivé do kosti.</span>
        </footer>
      </article>
    </div>
  );
}
