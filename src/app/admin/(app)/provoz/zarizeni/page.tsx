import type { Metadata } from "next";
import { saveDevice } from "@/app/admin/(app)/provoz/actions";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { DEVICE_KIND_LABEL, type DeviceKind, type DeviceRow } from "@/lib/admin";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Zařízení" };

function DeviceForm({ d }: { d?: DeviceRow }) {
  return (
    <form action={saveDevice} className="grid gap-2 rounded-card border border-line bg-white p-3 sm:grid-cols-[1fr_140px_90px_90px_90px_auto] sm:items-end">
      {d && <input type="hidden" name="id" value={d.id} />}
      <label className="block">
        <span className="mb-1 block text-label text-green">Název</span>
        <input name="name" defaultValue={d?.name} required placeholder="Mrazák 1 (mixy)" className="min-h-9 py-1" />
      </label>
      <label className="block">
        <span className="mb-1 block text-label text-green">Druh</span>
        <select name="kind" defaultValue={d?.kind ?? "mrazak"} className="min-h-9 py-1">
          {(Object.keys(DEVICE_KIND_LABEL) as DeviceKind[]).map((k) => (
            <option key={k} value={k}>
              {DEVICE_KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-label text-green">Min °C</span>
        <input name="min_c" type="number" step="0.5" defaultValue={d?.min_c ?? -25} className="min-h-9 py-1" />
      </label>
      <label className="block">
        <span className="mb-1 block text-label text-green">Max °C</span>
        <input name="max_c" type="number" step="0.5" defaultValue={d?.max_c ?? -18} className="min-h-9 py-1" />
      </label>
      <label className="block">
        <span className="mb-1 block text-label text-green">Pořadí</span>
        <input name="sort_order" type="number" defaultValue={d?.sort_order ?? 0} className="min-h-9 py-1" />
      </label>
      <div className="flex items-center gap-3">
        {d && (
          <label className="flex items-center gap-1 text-small">
            <input type="checkbox" name="active" value="on" defaultChecked={d.active} className="h-4 w-4 min-h-0 w-auto accent-green" />
            aktivní
          </label>
        )}
        {d && <input type="hidden" name="active" value="off" />}
        <Button type="submit" variant={d ? "secondary" : "primary"} className="min-h-9">
          {d ? "Uložit" : "Přidat"}
        </Button>
      </div>
    </form>
  );
}

export default async function DevicesPage() {
  await requireManager();
  const db = await getAuthSupabase();
  const { data } = await db.from("devices").select("*").order("sort_order").order("name");
  const devs = (data ?? []) as DeviceRow[];
  return (
    <>
      <PageHeader crumbs={[{ href: "/admin/provoz", label: "Teploty a checklisty" }]} title="Zařízení" subtitle="Mrazáky a chladničky s povoleným rozsahem. Mražené −18 až −25 °C, chlazené 0 až 4 °C (ověřte podle etiket a HACCP plánu)." />
      <div className="mt-5 space-y-3">
        {devs.map((d) => (
          <DeviceForm key={d.id} d={d} />
        ))}
        <p className="text-eyebrow uppercase mt-4 text-muted">Nové zařízení</p>
        <DeviceForm />
      </div>
    </>
  );
}
