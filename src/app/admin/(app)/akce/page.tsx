import type { Metadata } from "next";
import Link from "next/link";
import { cancelPriceAction, createPriceAction, runPriceActions } from "@/app/admin/(app)/akce/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PageHeader } from "@/components/admin/page-header";
import { Table, Td } from "@/components/admin/table";
import { Button, buttonClass } from "@/components/ui/button";
import { formatDay, PRICE_ACTION_STATUS_LABEL, type PriceActionRow, type ProductRow } from "@/lib/admin";
import { productName } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Akce a slevy" };

type Row = PriceActionRow & { products: Pick<ProductRow, "line" | "variant" | "price_czk" | "unit"> | null };

/** Akční ceny s platností (spouští a vrací denní kontrola) a odkaz na slevové kódy. */
export default async function PromotionsPage({ searchParams }: { searchParams: Promise<{ produkt?: string }> }) {
  await requireManager();
  const { produkt } = await searchParams;
  const db = await getAuthSupabase();
  const [{ data: actions }, { data: products }, { count: coupons }] = await Promise.all([
    db.from("price_actions").select("*, products(line, variant, price_czk, unit)").order("status").order("starts_on", { ascending: false }).limit(100),
    db.from("products").select("id, line, variant, price_czk, unit, is_published").order("line").order("sort_order").order("variant"),
    db.from("coupons").select("id", { count: "exact", head: true }).eq("active", true),
  ]);
  const rows = (actions ?? []) as Row[];
  const list = (products ?? []) as Pick<ProductRow, "id" | "line" | "variant" | "price_czk" | "unit" | "is_published">[];
  const todayDate = new Date();
  const today = todayDate.toISOString().slice(0, 10);
  todayDate.setDate(todayDate.getDate() + 14);
  const next = todayDate.toISOString().slice(0, 10);
  const order = { aktivni: 0, planovana: 1, skoncena: 2, zrusena: 3 };
  rows.sort((a, b) => order[a.status] - order[b.status] || b.starts_on.localeCompare(a.starts_on));

  return (
    <>
      <PageHeader
        title="Akce a slevy"
        subtitle="Akční cena platí od–do: v den začátku se cena přepne a původní zůstane přeškrtnutá na webu i v kase, po konci se vrátí sama."
        actions={
          <>
            <Link href="/admin/slevy" className={buttonClass("secondary")}>
              Slevové kódy{coupons ? ` · ${coupons}` : ""}
            </Link>
            <form action={runPriceActions}>
              <Button type="submit" variant="secondary">
                Zkontrolovat teď
              </Button>
            </form>
          </>
        }
      />

      <form action={createPriceAction} className="mt-5 grid gap-3 rounded-[var(--radius-card)] border border-line bg-paper p-4 sm:grid-cols-[1fr_140px_150px_150px_1fr_auto] sm:items-end">
        <label className="block">
          <span className="label mb-1 block text-[11px] text-muted">Produkt</span>
          <select name="product_id" defaultValue={produkt ?? ""} required className="min-h-9 py-1">
            <option value="">vyberte…</option>
            {list.map((p) => (
              <option key={p.id} value={p.id}>
                {productName(p)} · {formatPrice(p.price_czk)}
                {p.is_published ? "" : " (skrytý)"}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label mb-1 block text-[11px] text-muted">Akční cena (Kč)</span>
          <input name="sale_price_czk" type="number" min={0} required className="min-h-9 py-1" />
        </label>
        <label className="block">
          <span className="label mb-1 block text-[11px] text-muted">Od</span>
          <input name="starts_on" type="date" defaultValue={today} required className="min-h-9 py-1" />
        </label>
        <label className="block">
          <span className="label mb-1 block text-[11px] text-muted">Do (včetně)</span>
          <input name="ends_on" type="date" defaultValue={next} required className="min-h-9 py-1" />
        </label>
        <label className="block">
          <span className="label mb-1 block text-[11px] text-muted">Název (volitelně)</span>
          <input name="name" placeholder="např. Podzimní sleva" className="min-h-9 py-1" />
        </label>
        <Button type="submit" className="min-h-9">
          Naplánovat
        </Button>
      </form>

      <div className="mt-5">
        {rows.length === 0 ? (
          <p className="text-muted">Zatím žádná akce. Naplánujte první: vyberte produkt, akční cenu a platnost.</p>
        ) : (
          <Table head={["Produkt", "Akce", "Cena", "Platnost", "Stav", ""]}>
            {rows.map((a) => (
              <tr key={a.id} className={a.status === "skoncena" || a.status === "zrusena" ? "text-muted" : ""}>
                <Td className="font-semibold">{a.products ? productName(a.products) : "—"}</Td>
                <Td>{a.name || "—"}</Td>
                <Td className="whitespace-nowrap">
                  {formatPrice(a.sale_price_czk)} <span className="text-xs text-muted">místo {formatPrice(a.original_price_czk ?? a.products?.price_czk ?? 0)}</span>
                </Td>
                <Td className="whitespace-nowrap">
                  {formatDay(a.starts_on)} – {formatDay(a.ends_on)}
                </Td>
                <Td>
                  <span className={`label rounded-full px-2.5 py-0.5 text-[11px] ${a.status === "aktivni" ? "bg-brick text-cream" : a.status === "planovana" ? "bg-ochre-badge text-ink" : "border border-line text-muted"}`}>{PRICE_ACTION_STATUS_LABEL[a.status]}</span>
                </Td>
                <Td className="text-right">
                  {(a.status === "aktivni" || a.status === "planovana") && (
                    <ConfirmButton action={cancelPriceAction} fields={{ id: a.id }} title="Zrušit akci?" text={a.status === "aktivni" ? "Cena se hned vrátí na původní." : "Akce se nespustí."} confirmLabel="Zrušit akci" variant="ghost" className="min-h-8 px-2 text-[11px]">
                      Zrušit
                    </ConfirmButton>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
      <p className="mt-3 text-xs text-muted">Kontrola běží každý den ráno spolu s předplatným. Když akci založíte s dnešním datem, spustí se hned. Slevy na celou řadu nebo dopravu zdarma: doprava zdarma je v Nastavení → Doprava, sleva na řadu se zatím dělá kódem.</p>
    </>
  );
}
