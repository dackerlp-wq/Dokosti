import type { Metadata } from "next";
import Link from "next/link";
import { addShiftPlan, removeShiftPlan } from "@/app/admin/(app)/plan-smen/actions";
import { PageHeader } from "@/components/admin/page-header";
import { Pills } from "@/components/admin/stat";
import { Button } from "@/components/ui/button";
import { addDaysIso, formatDay, weekStartOf, type AttendanceRow, type EmployeeRow, type ShiftPlanRow } from "@/lib/admin";
import { DAY_NAMES_SHORT } from "@/lib/settings";
import { getAdmin, getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Plán směn" };

/** Týdenní plán: kdo má kdy být v prodejně. Skutečnost (docházka ze směn v kase) se ukazuje vedle plánu. */
export default async function ShiftPlanPage({ searchParams }: { searchParams: Promise<{ tyden?: string }> }) {
  await requireAdmin("brigada");
  const admin = (await getAdmin())!;
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const week = weekStartOf(/^\d{4}-\d{2}-\d{2}$/.test(sp.tyden ?? "") ? sp.tyden! : today);
  const days = Array.from({ length: 7 }, (_, i) => addDaysIso(week, i));
  const db = await getAuthSupabase();
  const [{ data: plans }, { data: emps }, { data: att }] = await Promise.all([
    db.from("shift_plans").select("*").gte("day", days[0]).lte("day", days[6]).order("starts"),
    db.from("employees").select("id, name, position").is("ended_on", null).order("name"),
    db.from("attendance").select("employee_id, day, started_at, ended_at, hours, kind").gte("day", days[0]).lte("day", days[6]),
  ]);
  const employees = (emps ?? []) as Pick<EmployeeRow, "id" | "name" | "position">[];
  const name = new Map(employees.map((e) => [e.id, e.name]));
  const byDay = new Map<string, ShiftPlanRow[]>();
  for (const p of (plans ?? []) as ShiftPlanRow[]) byDay.set(p.day, [...(byDay.get(p.day) ?? []), p]);
  const attByDay = new Map<string, Pick<AttendanceRow, "employee_id" | "day" | "started_at" | "ended_at" | "hours" | "kind">[]>();
  for (const a of (att ?? []) as Pick<AttendanceRow, "employee_id" | "day" | "started_at" | "ended_at" | "hours" | "kind">[]) attByDay.set(a.day, [...(attByDay.get(a.day) ?? []), a]);
  const hhmm = (t: string) => t.slice(0, 5);
  const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" }) : "…");
  const hoursPlanned = (p: ShiftPlanRow) => (Number(p.ends.slice(0, 2)) * 60 + Number(p.ends.slice(3, 5)) - Number(p.starts.slice(0, 2)) * 60 - Number(p.starts.slice(3, 5))) / 60;
  const perEmp = new Map<string, number>();
  for (const p of (plans ?? []) as ShiftPlanRow[]) perEmp.set(p.employee_id, (perEmp.get(p.employee_id) ?? 0) + hoursPlanned(p));

  return (
    <>
      <PageHeader
        title="Plán směn"
        subtitle="Kdo má kdy být v prodejně. Skutečné hodiny se berou z otevření a uzávěrky kasy (docházka), plán je pro domluvu dopředu. Ranní e-mail a Dnes ukazují, kdo má dnes směnu."
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Pills
          items={[
            { href: `/admin/plan-smen?tyden=${addDaysIso(week, -7)}`, label: "‹ předchozí", on: false },
            { href: `/admin/plan-smen?tyden=${week}`, label: `${formatDay(days[0])} – ${formatDay(days[6])}`, on: true },
            { href: `/admin/plan-smen?tyden=${addDaysIso(week, 7)}`, label: "další ›", on: false },
            ...(week !== weekStartOf(today) ? [{ href: "/admin/plan-smen", label: "Tento týden", on: false }] : []),
          ]}
        />
        <Link href={`/admin/kalendar?mesic=${week.slice(0, 7)}`} className="text-sm text-green hover:underline">
          Kalendář
        </Link>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-7">
        {days.map((d, i) => {
          const list = byDay.get(d) ?? [];
          const real = (attByDay.get(d) ?? []).filter((a) => a.kind === "prace");
          const off = (attByDay.get(d) ?? []).filter((a) => a.kind !== "prace");
          const isToday = d === today;
          return (
            <section key={d} className={`rounded-[var(--radius-card)] border bg-paper p-3 ${isToday ? "border-green" : "border-line"}`}>
              <p className={`label text-[11px] ${isToday ? "text-green" : "text-muted"}`}>
                {DAY_NAMES_SHORT[(i + 1) % 7]} {formatDay(d)}
              </p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {list.map((p) => (
                  <li key={p.id} className="rounded-[var(--radius-control)] border border-line bg-white px-2 py-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span>
                        <b className="font-semibold">{name.get(p.employee_id) ?? "—"}</b>
                        <span className="block text-xs text-muted">
                          {hhmm(p.starts)}–{hhmm(p.ends)}
                          {p.note ? ` · ${p.note}` : ""}
                        </span>
                      </span>
                      {admin.isManager && (
                        <form action={removeShiftPlan}>
                          <input type="hidden" name="id" value={p.id} />
                          <button type="submit" aria-label="Odebrat z plánu" className="text-xs text-muted hover:text-brick-text">
                            ×
                          </button>
                        </form>
                      )}
                    </div>
                  </li>
                ))}
                {list.length === 0 && <li className="text-xs text-muted">nikdo</li>}
              </ul>
              {(real.length > 0 || off.length > 0) && (
                <div className="mt-2 border-t border-line pt-2 text-xs text-muted">
                  {real.map((a, j) => (
                    <p key={j}>
                      {name.get(a.employee_id ?? "") ?? "?"}: v kase {time(a.started_at)}–{time(a.ended_at)}
                    </p>
                  ))}
                  {off.map((a, j) => (
                    <p key={`o${j}`}>
                      {name.get(a.employee_id ?? "") ?? "?"}: {a.kind}
                    </p>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {admin.isManager && (
        <form action={addShiftPlan} className="mt-4 rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <p className="label mb-2 text-[11px] text-muted">Naplánovat směnu</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <label className="block lg:col-span-2">
              <span className="label mb-1 block text-[11px] text-muted">Kdo</span>
              <select name="employee_id" required className="min-h-9 py-1">
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                    {e.position ? ` · ${e.position}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Den</span>
              <input name="day" type="date" defaultValue={today >= days[0] && today <= days[6] ? today : days[0]} required className="min-h-9 py-1" />
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Od</span>
              <input name="starts" type="time" defaultValue="08:00" required className="min-h-9 py-1" />
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Do</span>
              <input name="ends" type="time" defaultValue="16:00" required className="min-h-9 py-1" />
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Poznámka</span>
              <input name="note" placeholder="rozvoz, zaučení…" className="min-h-9 py-1" />
            </label>
          </div>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-green">Opakovat každý týden</summary>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <label key={d} className="flex items-center gap-1 text-sm">
                    <input type="checkbox" name="weekdays" value={d} className="h-4 w-4" /> {DAY_NAMES_SHORT[d]}
                  </label>
                ))}
              </div>
              <label className="block">
                <span className="label mb-1 block text-[11px] text-muted">Do data</span>
                <input name="until" type="date" className="min-h-9 py-1" />
              </label>
              <span className="text-xs text-muted">Ode dne výše do zadaného data, jen zaškrtnuté dny.</span>
            </div>
          </details>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button type="submit" className="min-h-9">
              Naplánovat
            </Button>
            {employees.length === 0 && <span className="text-xs text-brick-text">Nejdřív založte zaměstnance.</span>}
            {perEmp.size > 0 && <span className="text-xs text-muted">Tento týden: {[...perEmp.entries()].map(([id, h]) => `${name.get(id) ?? "?"} ${h.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} h`).join(" · ")}</span>}
          </div>
        </form>
      )}
    </>
  );
}
