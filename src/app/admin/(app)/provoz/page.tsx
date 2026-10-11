import type { Metadata } from "next";
import Link from "next/link";
import { logTemperature, toggleChecklistItem } from "@/app/admin/(app)/provoz/actions";
import { PageHeader } from "@/components/admin/page-header";
import { Button, buttonClass } from "@/components/ui/button";
import { CHECKLIST_PERIOD_LABEL, formatDate, formatDay, periodKeyFor, type ChecklistRow, type ChecklistRunRow, type DeviceRow, type TemperatureRow } from "@/lib/admin";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Teploty a checklisty" };

const DAY = 86_400_000;

/** Provozní deník: teploty zařízení (2× denně), hygiena a checklisty za den, týden, měsíc. */
export default async function ProvozPage() {
  const admin = await requireAdmin("brigada");
  const db = await getAuthSupabase();
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * DAY).toISOString().slice(0, 10);
  const [{ data: devices }, { data: temps }, { data: checklists }, { data: runs }] = await Promise.all([
    db.from("devices").select("*").eq("active", true).order("sort_order").order("name"),
    db.from("temperature_log").select("*").gte("measured_at", `${weekAgo}T00:00:00`).order("measured_at", { ascending: false }),
    db.from("checklists").select("*").eq("active", true).neq("period", "nastup").order("sort_order"),
    db.from("checklist_runs").select("*").in("period_key", [periodKeyFor("denne", now), periodKeyFor("tydne", now), periodKeyFor("mesicne", now)]),
  ]);
  const devs = (devices ?? []) as DeviceRow[];
  const logs = (temps ?? []) as TemperatureRow[];
  const lists = (checklists ?? []) as ChecklistRow[];
  const runRows = (runs ?? []) as ChecklistRunRow[];
  const todayLogs = (id: string) => logs.filter((l) => l.device_id === id && l.measured_at.slice(0, 10) === todayIso);
  const days = Array.from({ length: 7 }, (_, i) => new Date(now.getTime() - i * DAY).toISOString().slice(0, 10));
  const fmtT = (v: number) => `${Number(v).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} °C`;

  return (
    <>
      <PageHeader
        title="Teploty a checklisty"
        subtitle="Povinná evidence pro provoz se syrovým masem: teploty mrazáků a chladniček dvakrát denně, hygiena a úkoly dne. Každý zápis má jméno a čas."
        actions={
          admin.isManager ? (
            <>
              <Link href="/admin/provoz/zarizeni" className={buttonClass("secondary")}>
                Zařízení
              </Link>
              <Link href="/admin/provoz/checklisty" className={buttonClass("secondary")}>
                Upravit checklisty
              </Link>
              <Link href="/admin/export/teploty.csv" className={buttonClass("secondary")}>
                Export pro kontrolu
              </Link>
            </>
          ) : null
        }
      />

      <h2 className="mt-6 mb-2 text-[20px]">Teploty dnes, {formatDay(todayIso)}</h2>
      {devs.length === 0 ? (
        <p className="text-muted">
          Zatím žádné zařízení.{" "}
          {admin.isManager ? (
            <Link href="/admin/provoz/zarizeni" className="text-green underline">
              Přidejte mrazáky a chladničky s povoleným rozsahem.
            </Link>
          ) : (
            "Požádejte správce, aby přidal mrazáky a chladničky."
          )}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {devs.map((d) => {
            const t = todayLogs(d.id);
            const last = t[0];
            const bad = t.some((x) => !x.ok);
            return (
              <div key={d.id} className={`rounded-[var(--radius-card)] border bg-paper p-4 ${bad ? "border-brick" : t.length === 0 ? "border-ochre" : "border-line"}`}>
                <p className="label text-[11px] text-muted">{d.name}</p>
                <p className="text-[26px] font-semibold">{last ? fmtT(last.value_c) : <span className="text-muted">—</span>}</p>
                <p className="text-xs text-muted">
                  rozsah {Number(d.min_c)} až {Number(d.max_c)} °C
                  {last ? ` · ${new Date(last.measured_at).toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" })} ${last.created_by_name}` : ""}
                </p>
                <p className="mt-1">
                  <span className={`label rounded-full px-2 py-0.5 text-[10px] ${bad ? "bg-brick text-cream" : t.length >= 2 ? "bg-green text-cream" : t.length === 1 ? "bg-ochre-badge text-ink" : "border border-line text-muted"}`}>{bad ? "Mimo rozsah" : t.length >= 2 ? "Ráno i večer" : t.length === 1 ? "Zapsáno 1×" : "Chybí zápis"}</span>
                </p>
                <form action={logTemperature} className="mt-3 flex items-end gap-2">
                  <input type="hidden" name="device_id" value={d.id} />
                  <input name="value_c" type="number" step="0.1" inputMode="decimal" placeholder="°C" aria-label={`Teplota ${d.name}`} required className="min-h-10 w-24 text-center text-lg" />
                  <input name="note" placeholder="poznámka" aria-label="Poznámka" className="min-h-10 min-w-0 flex-1 text-sm" />
                  <Button type="submit" className="min-h-10 shrink-0 px-3">
                    Zapsat
                  </Button>
                </form>
              </div>
            );
          })}
        </div>
      )}
      <p className="mt-2 text-xs text-muted">Hodnota mimo rozsah jde zapsat jen s poznámkou, co jste udělali, a správce dostane upozornění na Dnes.</p>

      {devs.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-[16px]">Posledních 7 dní (ráno / večer)</h3>
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-paper">
            <table className="w-full text-sm">
              <thead>
                <tr className="label border-b border-line text-left text-[10px] text-muted">
                  <th className="px-3 py-2 font-semibold">Den</th>
                  {devs.map((d) => (
                    <th key={d.id} className="px-3 py-2 font-semibold">
                      {d.name}
                    </th>
                  ))}
                  <th className="px-3 py-2 font-semibold">Kdo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {days.map((day) => {
                  const dayLogs = logs.filter((l) => l.measured_at.slice(0, 10) === day);
                  const who = [...new Set(dayLogs.map((l) => l.created_by_name).filter(Boolean))].join(", ");
                  return (
                    <tr key={day}>
                      <td className="px-3 py-2 whitespace-nowrap">{formatDay(day)}</td>
                      {devs.map((d) => {
                        const mine = dayLogs.filter((l) => l.device_id === d.id).sort((a, b) => a.measured_at.localeCompare(b.measured_at));
                        return (
                          <td key={d.id} className="px-3 py-2 whitespace-nowrap">
                            {mine.length === 0 ? (
                              <span className="text-muted">—</span>
                            ) : (
                              mine.map((l, i) => (
                                <span key={l.id} className={l.ok ? "" : "font-semibold text-brick-text"} title={l.note}>
                                  {i > 0 && " / "}
                                  {Number(l.value_c).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })}
                                </span>
                              ))
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-muted">{who}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {logs.some((l) => !l.ok) && (
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {logs
                .filter((l) => !l.ok)
                .map((l) => (
                  <li key={l.id}>
                    {formatDate(l.measured_at)} · {devs.find((d) => d.id === l.device_id)?.name}: {fmtT(l.value_c)} mimo rozsah. {l.note} ({l.created_by_name})
                  </li>
                ))}
            </ul>
          )}
        </section>
      )}

      <h2 className="mt-8 mb-2 text-[20px]">Checklisty</h2>
      {lists.length === 0 ? (
        <p className="text-muted">Žádný checklist.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {lists.map((cl) => {
            const key = periodKeyFor(cl.period, now);
            const run = runRows.find((r) => r.checklist_id === cl.id && r.period_key === key);
            const doneCount = cl.items.filter((i) => run?.done?.[i.id]).length;
            return (
              <section key={cl.id} className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[16px]">{cl.name}</h3>
                  <span className={`label rounded-full px-2.5 py-0.5 text-[11px] ${doneCount === cl.items.length ? "bg-green text-cream" : doneCount > 0 ? "bg-ochre-badge text-ink" : "border border-line text-muted"}`}>
                    {doneCount} / {cl.items.length} · {CHECKLIST_PERIOD_LABEL[cl.period].toLowerCase()}
                  </span>
                </div>
                <ul className="mt-2 divide-y divide-line">
                  {cl.items.map((it) => {
                    const d = run?.done?.[it.id];
                    return (
                      <li key={it.id} className="flex items-center gap-3 py-2 text-sm">
                        <form action={toggleChecklistItem}>
                          <input type="hidden" name="checklist_id" value={cl.id} />
                          <input type="hidden" name="period_key" value={key} />
                          <input type="hidden" name="item_id" value={it.id} />
                          <input type="hidden" name="done" value={d ? "0" : "1"} />
                          <button type="submit" aria-label={d ? "Vrátit" : "Hotovo"} className={`flex h-6 w-6 items-center justify-center rounded border ${d ? "border-green bg-green text-cream" : "border-line bg-cream hover:border-green"}`}>
                            {d ? "✓" : ""}
                          </button>
                        </form>
                        <span className={`flex-1 ${d ? "text-muted line-through" : ""}`}>{it.text}</span>
                        {d && (
                          <span className="whitespace-nowrap text-xs text-muted">
                            {d.by} · {new Date(d.at).toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" })}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
