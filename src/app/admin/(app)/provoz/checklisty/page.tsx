import type { Metadata } from "next";
import { saveChecklist } from "@/app/admin/(app)/provoz/actions";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { CHECKLIST_PERIOD_LABEL, type ChecklistPeriod, type ChecklistRow } from "@/lib/admin";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Checklisty" };

function ChecklistForm({ c }: { c?: ChecklistRow }) {
  return (
    <form action={saveChecklist} className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_160px_90px]">
        <label className="block">
          <span className="label mb-1 block text-[11px] text-muted">Název</span>
          <input name="name" defaultValue={c?.name} required />
        </label>
        <label className="block">
          <span className="label mb-1 block text-[11px] text-muted">Období</span>
          <select name="period" defaultValue={c?.period ?? "denne"}>
            {(Object.keys(CHECKLIST_PERIOD_LABEL) as ChecklistPeriod[]).map((p) => (
              <option key={p} value={p}>
                {CHECKLIST_PERIOD_LABEL[p]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label mb-1 block text-[11px] text-muted">Pořadí</span>
          <input name="sort_order" type="number" defaultValue={c?.sort_order ?? 0} />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="label mb-1 block text-[11px] text-muted">Položky (každá na řádek)</span>
        <textarea name="items" rows={Math.max(4, (c?.items.length ?? 3) + 1)} defaultValue={c?.items.map((i) => i.text).join("\n")} required />
      </label>
      <div className="mt-3 flex items-center gap-3">
        {c && (
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" name="active" value="on" defaultChecked={c.active} className="h-4 w-4 min-h-0 w-auto accent-green" />
            aktivní
          </label>
        )}
        {c && <input type="hidden" name="active" value="off" />}
        <Button type="submit" variant={c ? "secondary" : "primary"}>
          {c ? "Uložit" : "Přidat checklist"}
        </Button>
      </div>
    </form>
  );
}

export default async function ChecklistsPage() {
  await requireManager();
  const db = await getAuthSupabase();
  const { data } = await db.from("checklists").select("*").order("sort_order");
  const lists = (data ?? []) as ChecklistRow[];
  return (
    <>
      <PageHeader crumbs={[{ href: "/admin/provoz", label: "Teploty a checklisty" }]} title="Checklisty" subtitle="Denní, týdenní a měsíční úkoly provozu a zaškolení nového člověka. Vycházejte z vašeho HACCP plánu." />
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {lists.map((c) => (
          <ChecklistForm key={c.id} c={c} />
        ))}
        <ChecklistForm />
      </div>
    </>
  );
}
