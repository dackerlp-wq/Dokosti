import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoPrint } from "@/components/pos/auto-print";
import { formatDate } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { POS_PAYMENT_LABEL, type PosSaleItemRow, type PosSaleRow } from "@/lib/pos";
import { getSettings } from "@/lib/settings";
import { vatBreakdown } from "@/lib/vat";
import { getAuthSupabase } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

/** Účtenka pro termotiskárnu 80 mm. ?tisk=1 otevře tisk hned po načtení. */
export default async function ReceiptPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tisk?: string }> }) {
  const [{ id }, { tisk }] = await Promise.all([params, searchParams]);
  const db = await getAuthSupabase();
  const [{ data: sale }, settings] = await Promise.all([db.from("pos_sales").select("*, customers(name, points)").eq("id", id).maybeSingle(), getSettings()]);
  if (!sale) notFound();
  const s = sale as PosSaleRow & { customers: { name: string; points: number } | null };
  let items: { name: string; qty: number; unit: string; unit_price_czk: number; line_total_czk: number; rate: number }[] = [];
  if (s.order_id) {
    const { data } = await db.from("order_items").select("name, qty, unit_price_czk, product_slug").eq("order_id", s.order_id);
    const rows = (data ?? []) as { name: string; qty: number; unit_price_czk: number; product_slug: string }[];
    const { data: prods } = rows.length ? await db.from("products").select("slug, unit, vat_rate").in("slug", rows.map((r) => r.product_slug)) : { data: [] };
    const bySlug = new Map(((prods ?? []) as { slug: string; unit: string; vat_rate: number }[]).map((p) => [p.slug, p]));
    items = rows.map((i) => ({ ...i, unit: bySlug.get(i.product_slug)?.unit ?? "ks", rate: bySlug.get(i.product_slug)?.vat_rate ?? 12, line_total_czk: Math.round(Number(i.qty) * i.unit_price_czk) }));
  } else {
    const { data } = await db.from("pos_sale_items").select("id, name, qty, unit, unit_price_czk, line_total_czk, product_id").eq("sale_id", id);
    const rows = (data ?? []) as (PosSaleItemRow & { product_id: string | null })[];
    const { data: prods } = rows.length ? await db.from("products").select("id, vat_rate").in("id", rows.map((r) => r.product_id).filter(Boolean) as string[]) : { data: [] };
    const byId = new Map(((prods ?? []) as { id: string; vat_rate: number }[]).map((p) => [p.id, p.vat_rate]));
    items = rows.map((i) => ({ ...i, rate: (i.product_id && byId.get(i.product_id)) || 12 }));
  }
  const shop = settings.shop;
  const vat = shop.vatPayer;
  const vatGroups = vat ? vatBreakdown(items.map((i) => ({ gross: i.line_total_czk, rate: i.rate })), Math.max(0, items.reduce((n, i) => n + i.line_total_czk, 0) - s.total_czk)) : [];

  return (
    <div className="mx-auto max-w-[360px] px-4 py-6 print:max-w-none print:p-0">
      {tisk === "1" && <AutoPrint />}
      <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
        <Link href="/admin/kasa" className="label text-[11px] text-green hover:underline">
          ← Zpět do kasy
        </Link>
        <AutoPrint button />
      </div>
      <article className="receipt bg-white p-4 font-mono text-[12px] leading-snug text-ink print:p-0">
        <header className="text-center">
          <p className="text-[22px] font-bold text-green">DoKosti</p>
          <p>{shop.name}</p>
          <p>
            {shop.address}, {shop.city}
          </p>
          <p>
            IČO {shop.ico}
            {vat && shop.dic ? ` · DIČ ${shop.dic}` : ""}
          </p>
          <p className="mt-2 text-[14px] font-bold">{s.status === "storno" ? "STORNO ÚČTENKY" : vat ? "Daňový doklad" : "Účtenka"}</p>
          <p>
            {s.number} · {formatDate(s.created_at)}
          </p>
        </header>
        <table className="mt-3 w-full">
          <tbody>
            {items.map((i, idx) => (
              <tr key={idx} className="align-top">
                <td className="py-0.5 pr-1">
                  {i.name}
                  <br />
                  <span className="text-muted">
                    {Number(i.qty).toLocaleString("cs-CZ", { maximumFractionDigits: 3 })} {i.unit} × {formatPrice(i.unit_price_czk)}
                  </span>
                </td>
                <td className="py-0.5 text-right align-bottom whitespace-nowrap">{formatPrice(i.line_total_czk)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 border-t border-dashed border-ink pt-2">
          {s.discount_czk > 0 && (
            <p className="flex justify-between">
              <span>Sleva{s.coupon_code ? ` ${s.coupon_code}` : ""}{s.discount_note ? ` · ${s.discount_note}` : ""}</span>
              <span>−{formatPrice(s.discount_czk)}</span>
            </p>
          )}
          {s.points_discount_czk > 0 && (
            <p className="flex justify-between">
              <span>Kostičky ({s.points_redeemed})</span>
              <span>−{formatPrice(s.points_discount_czk)}</span>
            </p>
          )}
          <p className="mt-1 flex justify-between text-[16px] font-bold">
            <span>CELKEM</span>
            <span>{formatPrice(s.total_czk)}</span>
          </p>
          {vat &&
            vatGroups.map((g) => (
              <p key={g.rate} className="flex justify-between text-muted">
                <span>z toho DPH {g.rate} % (základ {formatPrice(g.base)})</span>
                <span>{formatPrice(g.vat)}</span>
              </p>
            ))}
          <p className="mt-1 flex justify-between">
            <span>{POS_PAYMENT_LABEL[s.payment]}</span>
            {s.payment === "hotove" && s.cash_received_czk != null ? <span>přijato {formatPrice(s.cash_received_czk)}</span> : null}
          </p>
          {s.payment === "hotove" && s.change_czk != null && s.change_czk > 0 && (
            <p className="flex justify-between">
              <span>Vráceno</span>
              <span>{formatPrice(s.change_czk)}</span>
            </p>
          )}
        </div>
        {s.customers && (
          <div className="mt-2 border-t border-dashed border-ink pt-2">
            <p>Zákazník: {s.customers.name}</p>
            {s.points_earned > 0 && <p>+{s.points_earned} Kostiček, stav {s.customers.points}</p>}
          </div>
        )}
        <footer className="mt-3 border-t border-dashed border-ink pt-2 text-center">
          <p>{settings.pos.receiptFooter}</p>
          <p className="text-muted">{vat ? "Plátce DPH" : "Neplátce DPH"}</p>
        </footer>
      </article>
    </div>
  );
}
