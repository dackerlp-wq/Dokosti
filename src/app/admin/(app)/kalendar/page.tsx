import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Pills } from "@/components/admin/stat";
import { addDaysIso, isMonth, monthLabel, shiftMonth, weekStartOf, type ShiftPlanRow } from "@/lib/admin";
import { DAY_NAMES_SHORT } from "@/lib/settings";
import { getAdmin, getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Kalendář" };

type Ev = { kind: "smena" | "rozvoz" | "odber" | "ukol" | "dokument" | "vydaj" | "akce" | "volno"; text: string; href?: string; hot?: boolean };

/** Firemní kalendář po měsících: směny, rozvozy a odběry, úkoly s termínem, konce platnosti, splatnosti, akce, volno. */
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ mesic?: string }> }) {
  await requireAdmin("brigada");
  const admin = (await getAdmin())!;
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const month = isMonth(sp.mesic) ? sp.mesic : today.slice(0, 7);
  const first = `${month}-01`;
  const gridStart = weekStartOf(first);
  const lastDay = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).toISOString().slice(0, 10);
  const cells: string[] = [];
  for (let d = gridStart; cells.length < 42 && (d <= lastDay || cells.length % 7 !== 0); d = addDaysIso(d, 1)) cells.push(d);
  const from = cells[0];
  const to = cells[cells.length - 1];
  const db = await getAuthSupabase();
  const [{ data: plans }, { data: emps }, { data: orders }, { data: tasks }, { data: docs }, { data: expenses }, { data: actions }, { data: att }] = await Promise.all([
    db.from("shift_plans").select("*").gte("day", from).lte("day", to).order("starts"),
    db.from("employees").select("id, name"),
    db.from("orders").select("id, order_number, customer_name, shipping_method, delivery_date, status").in("status", ["nova", "potvrzena", "pripravena", "doruceno"]).gte("delivery_date", from).lte("delivery_date", to),
    db.from("tasks").select("id, title, due_on, href, done_at").gte("due_on", from).lte("due_on", to).is("done_at", null),
    admin.isManager ? db.from("documents").select("id, title, valid_to").is("archived_at", null).gte("valid_to", from).lte("valid_to", to) : Promise.resolve({ data: [] }),
    admin.isManager ? db.from("expenses").select("id, description, amount_czk, due_on, paid_at").is("paid_at", null).gte("due_on", from).lte("due_on", to) : Promise.resolve({ data: [] }),
    db.from("price_actions").select("id, name, starts_on, ends_on, status, products(variant)").neq("status", "zrusena").lte("starts_on", to).gte("ends_on", from),
    db.from("attendance").select("employee_id, day, kind").gte("day", from).lte("day", to).neq("kind", "prace"),
  ]);
  const name = new Map(((emps ?? []) as { id: string; name: string }[]).map((e) => [e.id, e.name]));
  const ev = new Map<string, Ev[]>();
  const add = (day: string, e: Ev) => ev.set(day, [...(ev.get(day) ?? []), e]);
  for (const p of (plans ?? []) as ShiftPlanRow[]) add(p.day, { kind: "smena", text: `${name.get(p.employee_id) ?? "?"} ${p.starts.slice(0, 5)}–${p.ends.slice(0, 5)}`, href: "/admin/plan-smen?tyden=" + p.day });
  for (const a of (att ?? []) as { employee_id: string | null; day: string; kind: string }[]) add(a.day, { kind: "volno", text: `${name.get(a.employee_id ?? "") ?? "?"}: ${a.kind}` });
  const perDayOrders = new Map<string, { rozvoz: number; odber: number }>();
  for (const o of (orders ?? []) as { delivery_date: string | null; shipping_method: string }[]) {
    if (!o.delivery_date) continue;
    const c = perDayOrders.get(o.delivery_date) ?? { rozvoz: 0, odber: 0 };
    if (o.shipping_method === "rozvoz") c.rozvoz++;
    else if (o.shipping_method === "odber") c.odber++;
    perDayOrders.set(o.delivery_date, c);
  }
  for (const [d, c] of perDayOrders) {
    if (c.rozvoz) add(d, { kind: "rozvoz", text: `${c.rozvoz}× rozvoz`, href: `/admin/rozvoz?den=${d === today ? "dnes" : d === addDaysIso(today, 1) ? "zitra" : ""}` });
    if (c.odber) add(d, { kind: "odber", text: `${c.odber}× odběr`, href: "/admin/rozvoz" });
  }
  for (const t of (tasks ?? []) as { id: string; title: string; due_on: string; href: string | null }[]) add(t.due_on, { kind: "ukol", text: t.title, href: t.href ?? "/admin/ukoly", hot: t.due_on < today });
  for (const d of (docs ?? []) as { id: string; title: string; valid_to: string }[]) add(d.valid_to, { kind: "dokument", text: `končí: ${d.title}`, href: `/admin/dokumenty/${d.id}`, hot: true });
  for (const e of (expenses ?? []) as { id: string; description: string; amount_czk: number; due_on: string }[]) add(e.due_on, { kind: "vydaj", text: `zaplatit ${e.description} (${Math.round(Number(e.amount_czk)).toLocaleString("cs-CZ")} Kč)`, href: "/admin/finance/splatnosti", hot: e.due_on < today });
  for (const a of (actions ?? []) as unknown as { id: string; name: string; starts_on: string; ends_on: string; products: { variant: string } | null }[]) {
    add(a.starts_on, { kind: "akce", text: `akce začíná: ${a.name || a.products?.variant || ""}`, href: "/admin/akce" });
    add(a.ends_on, { kind: "akce", text: `akce končí: ${a.name || a.products?.variant || ""}`, href: "/admin/akce" });
  }
  const style: Record<Ev["kind"], string> = { smena: "bg-green text-cream", rozvoz: "bg-ochre-badge text-ink", odber: "border border-line bg-white text-ink", ukol: "border border-line bg-white text-ink", dokument: "bg-brick text-white", vydaj: "border border-brick bg-white text-brick-text", akce: "bg-olive text-cream", volno: "border border-dashed border-line bg-white text-muted" };

  return (
    <>
      <PageHeader title="Kalendář" subtitle="Směny, rozvozy a odběry, úkoly s termínem, konce platnosti dokumentů, splatnosti a akce na jednom místě. Klik vede tam, kde se věc řeší." />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Pills
          items={[
            { href: `/admin/kalendar?mesic=${shiftMonth(month, -1)}`, label: "‹", on: false },
            { href: `/admin/kalendar?mesic=${month}`, label: monthLabel(month), on: true },
            { href: `/admin/kalendar?mesic=${shiftMonth(month, 1)}`, label: "›", on: false },
            ...(month !== today.slice(0, 7) ? [{ href: "/admin/kalendar", label: "Tento měsíc", on: false }] : []),
          ]}
        />
        <Link href="/admin/plan-smen" className="text-sm text-brick-text hover:underline">
          Plán směn
        </Link>
        <span className="ml-auto flex flex-wrap gap-1.5 text-[10px]">
          {(["smena", "rozvoz", "odber", "ukol", "dokument", "vydaj", "akce", "volno"] as Ev["kind"][]).map((k) => (
            <span key={k} className={`text-button rounded-full px-2 py-0.5 ${style[k]}`}>
              {{ smena: "směna", rozvoz: "rozvoz", odber: "odběr", ukol: "úkol", dokument: "dokument", vydaj: "splatnost", akce: "akce", volno: "volno" }[k]}
            </span>
          ))}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-px overflow-hidden rounded-card border border-line bg-line">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
          <div key={d} className="text-small font-semibold bg-paper px-2 py-1.5 text-muted">
            {DAY_NAMES_SHORT[d]}
          </div>
        ))}
        {cells.map((d) => {
          const inMonth = d.startsWith(month);
          const list = ev.get(d) ?? [];
          return (
            <div key={d} className={`min-h-[96px] p-1.5 ${inMonth ? "bg-white" : "bg-paper"} ${d === today ? "outline outline-2 -outline-offset-2 outline-green" : ""}`}>
              <p className={`text-small ${d === today ? "font-semibold text-green" : inMonth ? "text-ink" : "text-muted"}`}>{Number(d.slice(8, 10))}</p>
              <ul className="mt-1 space-y-0.5">
                {list.slice(0, 6).map((e, i) => (
                  <li key={i} className={`text-eyebrow uppercase truncate rounded px-1.5 py-0.5 ${style[e.kind]} ${e.hot ? "font-bold" : ""}`} title={e.text}>
                    {e.href ? (
                      <Link href={e.href} className="hover:underline">
                        {e.text}
                      </Link>
                    ) : (
                      e.text
                    )}
                  </li>
                ))}
                {list.length > 6 && <li className="text-[10px] text-muted">+{list.length - 6} dalších</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}
