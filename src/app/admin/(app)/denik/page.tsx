import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { StockFilters } from "@/components/admin/stock-filters";
import { Table, Td } from "@/components/admin/table";
import { activityHref, type ActivityRow } from "@/lib/activity";
import { formatDate } from "@/lib/admin";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Deník změn" };

const SUBJECTS: Record<string, string> = { order: "Objednávky", product: "Produkty", customer: "Zákazníci", receipt: "Příjemky", coupon: "Slevy", settings: "Nastavení", card: "Karty", inquiry: "Poradna", task: "Úkoly", shift: "Směny", sale: "Kasa", batch: "Šarže", admin: "Uživatelé", subscription: "Předplatné", employee: "Zaměstnanci", document: "Dokumenty", device: "Zařízení", attendance: "Docházka", checklist: "Checklisty", payroll: "Mzdy", expense: "Výdaje" };

/** Deník změn: kdo, kdy, co změnil, napříč celým adminem. */
export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ q?: string; typ?: string; od?: string; do?: string }> }) {
  const sp = await searchParams;
  await requireAdmin("obsluha");
  const db = await getAuthSupabase();
  let q = db.from("activity_log").select("*").order("created_at", { ascending: false }).limit(300);
  if (sp.typ && sp.typ in SUBJECTS) q = q.eq("subject_type", sp.typ);
  if (sp.od) q = q.gte("created_at", `${sp.od}T00:00:00`);
  if (sp.do) q = q.lte("created_at", `${sp.do}T23:59:59`);
  if (sp.q?.trim()) q = q.or(`text.ilike.%${sp.q.trim().replace(/[%,()]/g, "")}%,actor_name.ilike.%${sp.q.trim().replace(/[%,()]/g, "")}%`);
  const { data } = await q;
  const rows = (data ?? []) as ActivityRow[];

  return (
    <>
      <PageHeader title="Deník změn" subtitle="Každá akce v adminu a kase se sem zapíše se jménem a časem. Nic se odsud nemaže." />
      <div className="mt-4">
        <StockFilters action="/admin/denik" search={{ name: "q", value: sp.q, placeholder: "Hledat v textu nebo jméně" }} selects={[{ name: "typ", value: sp.typ, label: "Oblast", options: [{ value: "", label: "Všechny oblasti" }, ...Object.entries(SUBJECTS).map(([value, label]) => ({ value, label }))] }]}>
          <input type="date" name="od" defaultValue={sp.od} aria-label="Od" className="min-h-9 w-auto py-1" />
          <span className="text-muted">–</span>
          <input type="date" name="do" defaultValue={sp.do} aria-label="Do" className="min-h-9 w-auto py-1" />
        </StockFilters>
      </div>
      <div className="mt-3">
        {rows.length === 0 ? (
          <p className="text-muted">Zatím žádný záznam.</p>
        ) : (
          <Table head={["Kdy", "Kdo", "Oblast", "Co se stalo"]}>
            {rows.map((r) => {
              const href = activityHref(r);
              return (
                <tr key={r.id}>
                  <Td className="whitespace-nowrap text-muted">{formatDate(r.created_at)}</Td>
                  <Td className="whitespace-nowrap">{r.actor_name || "systém"}</Td>
                  <Td className="whitespace-nowrap text-muted">{SUBJECTS[r.subject_type] ?? r.subject_type}</Td>
                  <Td>
                    {href ? (
                      <Link href={href} className="hover:underline">
                        {r.text}
                      </Link>
                    ) : (
                      r.text
                    )}
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
        {rows.length >= 300 && <p className="mt-1 text-xs text-muted">Zobrazeno posledních 300 záznamů, zúžte filtr.</p>}
      </div>
    </>
  );
}
