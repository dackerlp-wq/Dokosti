import type { Metadata } from "next";
import Link from "next/link";
import { saveSupplier } from "@/app/admin/(app)/dodavatele/actions";
import { PageHeader } from "@/components/admin/page-header";
import { Table, Td } from "@/components/admin/table";
import { Button } from "@/components/ui/button";
import type { SupplierRow } from "@/lib/admin";
import { DAY_NAMES_SHORT } from "@/lib/settings";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Dodavatelé" };

/** Číselník dodavatelů: kdy se objednává, jak dlouho veze, kolik produktů od něj bereme. */
export default async function SuppliersPage() {
  await requireAdmin();
  const db = await getAuthSupabase();
  const [{ data }, { data: products }, { data: open }] = await Promise.all([
    db.from("suppliers").select("*").order("active", { ascending: false }).order("name"),
    db.from("products").select("supplier_id").not("supplier_id", "is", null),
    db.from("purchase_orders").select("supplier_id, status").in("status", ["navrh", "odeslana"]),
  ]);
  const rows = (data ?? []) as SupplierRow[];
  const counts = new Map<string, number>();
  for (const p of (products ?? []) as { supplier_id: string }[]) counts.set(p.supplier_id, (counts.get(p.supplier_id) ?? 0) + 1);
  const openPo = new Map<string, number>();
  for (const o of (open ?? []) as { supplier_id: string }[]) openPo.set(o.supplier_id, (openPo.get(o.supplier_id) ?? 0) + 1);

  return (
    <>
      <PageHeader title="Dodavatelé" subtitle="Od koho zboží bereme. Dodavatel u produktu předvyplní příjemku a objednávku a Sklad podle něj radí, kdy a kolik objednat." />
      <form action={saveSupplier} className="mt-4 flex flex-wrap items-end gap-2 rounded-card border border-line bg-white p-3">
        <label className="min-w-[200px] flex-1">
          <span className="mb-1 block text-label text-green">Nový dodavatel</span>
          <input name="name" required placeholder="např. Yoggies" className="min-h-9 py-1" />
        </label>
        <label>
          <span className="mb-1 block text-label text-green">E-mail pro objednávky</span>
          <input name="email" type="email" className="min-h-9 py-1" />
        </label>
        <label>
          <span className="mb-1 block text-label text-green">Objednávkový den</span>
          <select name="order_weekday" className="min-h-9 w-auto py-1">
            <option value="">kdykoli</option>
            {DAY_NAMES_SHORT.map((d, i) => (
              <option key={i} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-label text-green">Dodací lhůta (dní)</span>
          <input name="lead_days" type="number" min={0} defaultValue={3} className="min-h-9 w-24 py-1" />
        </label>
        <Button type="submit" className="min-h-9">
          Založit
        </Button>
      </form>
      <div className="mt-4">
        {rows.length === 0 ? (
          <p className="text-muted">Zatím žádný dodavatel. Založte prvního a přiřaďte mu produkty.</p>
        ) : (
          <Table head={["Dodavatel", "Kontakt", "Objednává se", "Dodání", "Produktů", "Otevřené objednávky"]}>
            {rows.map((s) => (
              <tr key={s.id} className={s.active ? "" : "text-muted"}>
                <Td>
                  <Link href={`/admin/dodavatele/${s.id}`} className="font-semibold text-brick-text hover:underline">
                    {s.name}
                  </Link>
                  {!s.active && <span className="ml-2 text-small">neaktivní</span>}
                </Td>
                <Td className="text-muted">{[s.contact, s.email, s.phone].filter(Boolean).join(" · ") || "—"}</Td>
                <Td>{s.order_weekday === null ? "kdykoli" : DAY_NAMES_SHORT[s.order_weekday]}</Td>
                <Td>{s.lead_days} dní</Td>
                <Td>{counts.get(s.id) ?? 0}</Td>
                <Td>{openPo.get(s.id) ? <Link href={`/admin/nakup?dodavatel=${s.id}`} className="text-brick-text hover:underline">{openPo.get(s.id)}</Link> : <span className="text-muted">—</span>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}
