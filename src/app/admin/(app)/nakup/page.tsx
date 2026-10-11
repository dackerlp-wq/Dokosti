import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Pills } from "@/components/admin/stat";
import { Table, Td } from "@/components/admin/table";
import { buttonClass } from "@/components/ui/button";
import { formatDate, formatDay, PURCHASE_ORDER_STATUS_LABEL, type PurchaseOrderRow, type PurchaseOrderStatus } from "@/lib/admin";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Objednávky u dodavatelů" };

type Row = PurchaseOrderRow & { suppliers: { name: string } | null; purchase_order_items: { qty: number; unit_cost_czk: number }[] };

/** Objednávky zboží u dodavatelů: návrh → odeslaná → přijatá příjemkou. */
export default async function PurchaseOrdersPage({ searchParams }: { searchParams: Promise<{ stav?: string; dodavatel?: string }> }) {
  await requireAdmin();
  const { stav, dodavatel } = await searchParams;
  const db = await getAuthSupabase();
  let q = db.from("purchase_orders").select("*, suppliers(name), purchase_order_items(qty, unit_cost_czk)").order("created_at", { ascending: false }).limit(100);
  const status = stav && stav in PURCHASE_ORDER_STATUS_LABEL ? (stav as PurchaseOrderStatus) : undefined;
  if (status) q = q.eq("status", status);
  else if (!stav) q = q.in("status", ["navrh", "odeslana"]);
  if (dodavatel) q = q.eq("supplier_id", dodavatel);
  const { data } = await q;
  const rows = (data ?? []) as Row[];
  const base = dodavatel ? `&dodavatel=${dodavatel}` : "";

  return (
    <>
      <PageHeader
        title="Objednávky u dodavatelů"
        subtitle="Co je objednané a kdy přijede. Příjemka z objednávky porovná dodané množství s objednaným."
        actions={
          <Link href="/admin/nakup/nova" className={buttonClass("primary")}>
            Nová objednávka
          </Link>
        }
      />
      <div className="mt-4">
        <Pills
          items={[
            { href: `/admin/nakup?stav=${base ? `&${base.slice(1)}` : ""}`.replace("stav=&", ""), label: "Otevřené", on: !stav },
            { href: `/admin/nakup?stav=odeslana${base}`, label: "Na cestě", on: stav === "odeslana" },
            { href: `/admin/nakup?stav=prijata${base}`, label: "Přijaté", on: stav === "prijata" },
            { href: `/admin/nakup?stav=vse${base}`, label: "Vše", on: stav === "vse" },
          ]}
        />
      </div>
      <div className="mt-4">
        {rows.length === 0 ? (
          <p className="text-muted">Žádná objednávka. Novou založíte tlačítkem nahoře nebo ze Skladu u docházejícího zboží.</p>
        ) : (
          <Table head={["Číslo", "Dodavatel", "Vytvořena", "Položek", "Očekáváno", "Stav"]}>
            {rows.map((o) => (
              <tr key={o.id}>
                <Td>
                  <Link href={`/admin/nakup/${o.id}`} className="font-semibold text-brick-text hover:underline">
                    {o.number}
                  </Link>
                </Td>
                <Td>{o.suppliers?.name ?? "—"}</Td>
                <Td className="whitespace-nowrap text-muted">{formatDate(o.created_at)}</Td>
                <Td>{o.purchase_order_items.length}</Td>
                <Td className="whitespace-nowrap">{o.expected_on ? formatDay(o.expected_on) : "—"}</Td>
                <Td>
                  <span className={`text-button rounded-full px-2.5 py-0.5 ${o.status === "odeslana" ? "bg-ochre-badge text-ink" : o.status === "prijata" ? "bg-green text-cream" : o.status === "zrusena" ? "border border-line text-muted" : "border border-line bg-white text-muted"}`}>{PURCHASE_ORDER_STATUS_LABEL[o.status]}</span>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}
