import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { assignProducts, saveSupplier } from "@/app/admin/(app)/dodavatele/actions";
import { PageHeader } from "@/components/admin/page-header";
import { Table, Td } from "@/components/admin/table";
import { Button, buttonClass } from "@/components/ui/button";
import { formatDate, PURCHASE_ORDER_STATUS_LABEL, type ProductRow, type PurchaseOrderRow, type SupplierRow } from "@/lib/admin";
import { LINE_INFO, productName } from "@/lib/catalog";
import { DAY_NAMES_SHORT } from "@/lib/settings";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Dodavatel" };

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const db = await getAuthSupabase();
  const [{ data }, { data: products }, { data: orders }] = await Promise.all([
    db.from("suppliers").select("*").eq("id", id).maybeSingle(),
    db.from("products").select("id, line, variant, unit, supplier_id, purchase_price_czk, pack_size").order("line").order("sort_order").order("variant"),
    db.from("purchase_orders").select("*").eq("supplier_id", id).order("created_at", { ascending: false }).limit(20),
  ]);
  if (!data) notFound();
  const s = data as SupplierRow;
  const all = (products ?? []) as Pick<ProductRow, "id" | "line" | "variant" | "unit" | "supplier_id" | "purchase_price_czk" | "pack_size">[];
  const pos = (orders ?? []) as PurchaseOrderRow[];

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/admin/dodavatele", label: "Dodavatelé" }]}
        title={s.name}
        subtitle={`${all.filter((p) => p.supplier_id === id).length} produktů · objednává se ${s.order_weekday === null ? "kdykoli" : DAY_NAMES_SHORT[s.order_weekday]} · dodání ${s.lead_days} dní`}
        actions={
          <Link href={`/admin/nakup/nova?dodavatel=${id}`} className={buttonClass("primary")}>
            Objednat u dodavatele
          </Link>
        }
      />
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <form action={saveSupplier} className="rounded-card border border-line bg-white p-4">
          <input type="hidden" name="id" value={s.id} />
          <h2 className="text-[18px]">Údaje</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-label text-green">Název</span>
              <input name="name" defaultValue={s.name} required />
            </label>
            <label className="block">
              <span className="mb-1 block text-label text-green">Kontaktní osoba</span>
              <input name="contact" defaultValue={s.contact} />
            </label>
            <label className="block">
              <span className="mb-1 block text-label text-green">E-mail pro objednávky</span>
              <input name="email" type="email" defaultValue={s.email} />
            </label>
            <label className="block">
              <span className="mb-1 block text-label text-green">Telefon</span>
              <input name="phone" defaultValue={s.phone} />
            </label>
            <label className="block">
              <span className="mb-1 block text-label text-green">Objednávkový den</span>
              <select name="order_weekday" defaultValue={s.order_weekday ?? ""}>
                <option value="">kdykoli</option>
                {DAY_NAMES_SHORT.map((d, i) => (
                  <option key={i} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-label text-green">Dodací lhůta (dní)</span>
              <input name="lead_days" type="number" min={0} defaultValue={s.lead_days} />
            </label>
            <label className="block">
              <span className="mb-1 block text-label text-green">Minimální objednávka (Kč)</span>
              <input name="min_order_czk" type="number" min={0} defaultValue={s.min_order_czk} />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-label text-green">Poznámka</span>
              <textarea name="note" rows={2} defaultValue={s.note} placeholder="např. B2B portál, slevy při odběru nad 10 000 Kč" />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="active" value="on" defaultChecked={s.active} className="h-4 w-4 min-h-0 w-auto accent-green" />
              Aktivní (nabízí se v příjemce a objednávkách)
            </label>
            <input type="hidden" name="active" value="off" />
          </div>
          <Button type="submit" className="mt-4">
            Uložit
          </Button>
        </form>

        <div className="space-y-5">
          <form action={assignProducts} className="rounded-card border border-line bg-white p-4">
            <input type="hidden" name="supplier_id" value={s.id} />
            <h2 className="text-[18px]">Produkty od tohoto dodavatele</h2>
            <p className="mt-1 text-small text-muted">Zaškrtnuté produkty se předvyplní v objednávce a Sklad u nich počítá s dodací lhůtou.</p>
            <div className="mt-3 max-h-[420px] overflow-y-auto">
              {all.map((p) => {
                const other = p.supplier_id && p.supplier_id !== id;
                return (
                  <label key={p.id} className={`flex items-center gap-2 border-t border-line py-1.5 text-sm first:border-t-0 ${other ? "text-muted" : ""}`}>
                    <input type="checkbox" name="product_id" value={p.id} defaultChecked={p.supplier_id === id} className="h-4 w-4 min-h-0 w-auto accent-green" />
                    <span className="min-w-0 flex-1 truncate">
                      {productName(p)} <span className="text-small text-muted">· {LINE_INFO[p.line].name}</span>
                    </span>
                    {other && <span className="text-small">jiný dodavatel</span>}
                  </label>
                );
              })}
            </div>
            <Button type="submit" variant="secondary" className="mt-3">
              Uložit výběr
            </Button>
          </form>

          <section className="rounded-card border border-line bg-white p-4">
            <h2 className="text-[18px]">Objednávky u dodavatele</h2>
            {pos.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Zatím žádná.</p>
            ) : (
              <div className="mt-2">
                <Table head={["Číslo", "Vytvořena", "Stav", "Očekáváno"]}>
                  {pos.map((o) => (
                    <tr key={o.id}>
                      <Td>
                        <Link href={`/admin/nakup/${o.id}`} className="font-semibold text-brick-text hover:underline">
                          {o.number}
                        </Link>
                      </Td>
                      <Td className="text-muted">{formatDate(o.created_at)}</Td>
                      <Td>{PURCHASE_ORDER_STATUS_LABEL[o.status]}</Td>
                      <Td className="text-muted">{o.expected_on ?? "—"}</Td>
                    </tr>
                  ))}
                </Table>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
