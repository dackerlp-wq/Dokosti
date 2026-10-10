import type { Metadata } from "next";
import Link from "next/link";
import { createTask, deleteTask, toggleTask } from "@/app/admin/(app)/ukoly/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PageHeader } from "@/components/admin/page-header";
import { Pills } from "@/components/admin/stat";
import { Button } from "@/components/ui/button";
import { formatDate, formatDay } from "@/lib/admin";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";
import type { TaskRow } from "@/lib/tasks";

export const metadata: Metadata = { title: "Úkoly" };

type View = "otevrene" | "moje" | "hotove";

/** Úkoly týmu: ruční i automatické (ze splatností, smluv, skladu). Odškrtnutí zapíše kdo a kdy. */
export default async function TasksPage({ searchParams }: { searchParams: Promise<{ pohled?: string }> }) {
  const { pohled } = await searchParams;
  const view: View = pohled === "moje" || pohled === "hotove" ? pohled : "otevrene";
  const [admin, db] = await Promise.all([requireAdmin("brigada"), getAuthSupabase()]);
  const todayIso = new Date().toISOString().slice(0, 10);

  let q = db.from("tasks").select("*");
  q = view === "hotove" ? q.not("done_at", "is", null).order("done_at", { ascending: false }).limit(100) : q.is("done_at", null).order("due_on", { ascending: true, nullsFirst: false }).order("created_at");
  if (view === "moje") q = q.eq("assigned_to", admin.id);
  const [{ data }, { data: people }, { count: openCount }, { count: mineCount }] = await Promise.all([
    q,
    admin.isManager ? db.rpc("admin_list") : db.from("admins").select("user_id, name"),
    db.from("tasks").select("id", { count: "exact", head: true }).is("done_at", null),
    db.from("tasks").select("id", { count: "exact", head: true }).is("done_at", null).eq("assigned_to", admin.id),
  ]);
  const tasks = (data ?? []) as TaskRow[];
  const names = new Map<string, string>();
  for (const p of (people ?? []) as { user_id: string; name: string; email?: string }[]) names.set(p.user_id, p.name || p.email?.split("@")[0] || "kolega");

  return (
    <>
      <PageHeader title="Úkoly" subtitle="Co je potřeba udělat mimo objednávky: ruční úkoly a ty, které systém založí sám (splatnost, končící smlouva, prošlá revize)." />
      <div className="mt-4">
        <Pills
          items={[
            { href: "/admin/ukoly", label: `Otevřené · ${openCount ?? 0}`, on: view === "otevrene" },
            { href: "/admin/ukoly?pohled=moje", label: `Moje · ${mineCount ?? 0}`, on: view === "moje" },
            { href: "/admin/ukoly?pohled=hotove", label: "Hotové", on: view === "hotove" },
          ]}
        />
      </div>

      <form action={createTask} className="mt-4 flex flex-wrap items-end gap-2 rounded-[var(--radius-card)] border border-line bg-paper p-3">
        <label className="min-w-[240px] flex-1">
          <span className="label mb-1 block text-[11px] text-muted">Nový úkol</span>
          <input name="title" required placeholder="např. objednat technika na revizi hasicích přístrojů" className="min-h-9 py-1" />
        </label>
        <label>
          <span className="label mb-1 block text-[11px] text-muted">Termín</span>
          <input name="due_on" type="date" className="min-h-9 w-auto py-1" />
        </label>
        <label>
          <span className="label mb-1 block text-[11px] text-muted">Komu</span>
          <select name="assigned_to" defaultValue={admin.id} className="min-h-9 w-auto py-1">
            <option value="">kdokoli</option>
            {[...names.entries()].map(([id, n]) => (
              <option key={id} value={id}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" className="min-h-9">
          Přidat
        </Button>
      </form>

      <div className="mt-4 rounded-[var(--radius-card)] border border-line bg-paper">
        {tasks.length === 0 ? (
          <p className="px-4 py-8 text-center text-muted">{view === "hotove" ? "Zatím nic hotového." : "Nic nečeká. Máte hotovo."}</p>
        ) : (
          <ul className="divide-y divide-line">
            {tasks.map((t) => {
              const overdue = !t.done_at && t.due_on && t.due_on < todayIso;
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <form action={toggleTask}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="done" value={t.done_at ? "0" : "1"} />
                    <button type="submit" aria-label={t.done_at ? "Vrátit mezi otevřené" : "Hotovo"} className={`flex h-6 w-6 items-center justify-center rounded border ${t.done_at ? "border-green bg-green text-cream" : "border-line bg-cream hover:border-green"}`}>
                      {t.done_at ? "✓" : ""}
                    </button>
                  </form>
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold ${t.done_at ? "text-muted line-through" : ""}`}>{t.title}</p>
                    <p className="text-xs text-muted">
                      {t.detail && `${t.detail} · `}
                      {t.kind === "auto" ? "automaticky" : `zadal ${names.get(t.created_by ?? "") ?? "kolega"}`}
                      {t.assigned_to && ` · pro ${names.get(t.assigned_to) ?? "kolegu"}`}
                      {t.done_at && ` · hotovo ${formatDate(t.done_at)} (${names.get(t.done_by ?? "") ?? ""})`}
                    </p>
                  </div>
                  {t.due_on && !t.done_at && <span className={`label text-[11px] ${overdue ? "text-brick-text" : "text-muted"}`}>{overdue ? "po termínu · " : "do "}{formatDay(t.due_on)}</span>}
                  {t.href && (
                    <Link href={t.href} className="text-sm text-green hover:underline">
                      Otevřít
                    </Link>
                  )}
                  {t.kind === "rucni" && admin.role !== "brigada" && (
                    <ConfirmButton action={deleteTask} fields={{ id: t.id }} title="Smazat úkol?" text={`„${t.title}“ zmizí ze seznamu. Do deníku změn se zapíše, kdo ho smazal.`} confirmLabel="Smazat" variant="ghost" className="min-h-8 px-2 text-[11px]">
                      Smazat
                    </ConfirmButton>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
