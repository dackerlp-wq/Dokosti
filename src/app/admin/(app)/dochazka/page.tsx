import type { Metadata } from "next";
import Link from "next/link";
import { addAttendance, deleteAttendance } from "@/app/admin/(app)/dochazka/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PageHeader } from "@/components/admin/page-header";
import { Table, Td } from "@/components/admin/table";
import { Button, buttonClass } from "@/components/ui/button";
import { ATTENDANCE_KIND_LABEL, formatDay, type AttendanceKind, type AttendanceRow, type EmployeeRow } from "@/lib/admin";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Docházka" };

/** Docházka: obsluha vidí svou, správce všechny. Hodiny jdou ze směn v kase, ručně se dopisují výjimky. */
export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ mesic?: string; zamestnanec?: string }> }) {
  const admin = await requireAdmin("brigada");
  const sp = await searchParams;
  const month = sp.mesic && /^\d{4}-\d{2}$/.test(sp.mesic) ? sp.mesic : new Date().toISOString().slice(0, 7);
  const db = await getAuthSupabase();
  const [{ data: employees }, { data: rows }] = await Promise.all([
    admin.isManager ? db.from("employees").select("*").is("ended_on", null).order("name") : db.from("employees").select("*").eq("user_id", admin.id),
    (() => {
      let q = db.from("attendance").select("*").gte("day", `${month}-01`).lte("day", `${month}-31`).order("day", { ascending: false }).order("started_at", { ascending: false });
      if (admin.isManager && sp.zamestnanec) q = q.eq("employee_id", sp.zamestnanec);
      if (!admin.isManager) q = q.eq("user_id", admin.id);
      return q;
    })(),
  ]);
  const emps = (employees ?? []) as EmployeeRow[];
  const list = (rows ?? []) as AttendanceRow[];
  const empName = new Map(emps.map((e) => [e.id, e.name]));
  const prev = new Date(`${month}-01T12:00:00`);
  prev.setMonth(prev.getMonth() - 1);
  const next = new Date(`${month}-01T12:00:00`);
  next.setMonth(next.getMonth() + 1);
  const monthLabel = new Intl.DateTimeFormat("cs-CZ", { month: "long", year: "numeric" }).format(new Date(`${month}-01T12:00:00`));
  const summary = new Map<string, { prace: number; dovolena: number; nemoc: number; other: number }>();
  for (const r of list) {
    const k = r.employee_id ?? r.user_id ?? "?";
    const s = summary.get(k) ?? { prace: 0, dovolena: 0, nemoc: 0, other: 0 };
    const h = Number(r.hours ?? 0);
    if (r.kind === "prace") s.prace += h;
    else if (r.kind === "dovolena") s.dovolena += h;
    else if (r.kind === "nemoc") s.nemoc += h;
    else s.other += h;
    summary.set(k, s);
  }
  const fmtH = (n: number) => n.toLocaleString("cs-CZ", { maximumFractionDigits: 2 });

  return (
    <>
      <PageHeader
        title="Docházka"
        subtitle={admin.isManager ? "Příchod a odchod vzniká otevřením a uzávěrkou směny v kase, ručně se dopisují rozvoz, dovolená, nemoc a svátky. Měsíc je podkladem pro mzdy." : "Vaše hodiny: směny z kasy a ruční záznamy. Ruční záznam přidáte níže."}
        actions={admin.isManager ? <a href={`/admin/export/dochazka.csv?mesic=${month}`} className={buttonClass("secondary")}>Podklady pro mzdy (CSV)</a> : null}
      />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={`/admin/dochazka?mesic=${prev.toISOString().slice(0, 7)}${sp.zamestnanec ? `&zamestnanec=${sp.zamestnanec}` : ""}`} className="label text-[11px] text-green hover:underline">
          ← předchozí
        </Link>
        <span className="label text-[11px]">{monthLabel}</span>
        <Link href={`/admin/dochazka?mesic=${next.toISOString().slice(0, 7)}${sp.zamestnanec ? `&zamestnanec=${sp.zamestnanec}` : ""}`} className="label text-[11px] text-green hover:underline">
          další →
        </Link>
        {admin.isManager && emps.length > 0 && (
          <form className="ml-auto flex items-center gap-2">
            <input type="hidden" name="mesic" value={month} />
            <select name="zamestnanec" defaultValue={sp.zamestnanec ?? ""} aria-label="Zaměstnanec" className="min-h-9 w-auto py-1">
              <option value="">všichni</option>
              {emps.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary" className="min-h-9">
              Zobrazit
            </Button>
          </form>
        )}
      </div>

      {admin.isManager && summary.size > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...summary.entries()].map(([k, s]) => (
            <div key={k} className="rounded-[var(--radius-card)] border border-line bg-paper p-3">
              <p className="label text-[11px] text-muted">{empName.get(k) ?? "bez zaměstnance"}</p>
              <p className="text-[22px] font-semibold">{fmtH(s.prace)} h</p>
              <p className="text-xs text-muted">
                {s.dovolena ? `dovolená ${fmtH(s.dovolena)} h · ` : ""}
                {s.nemoc ? `nemoc ${fmtH(s.nemoc)} h · ` : ""}
                {s.other ? `ostatní ${fmtH(s.other)} h` : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      <form action={addAttendance} className="mt-4 flex flex-wrap items-end gap-2 rounded-[var(--radius-card)] border border-line bg-paper p-3">
        {admin.isManager && (
          <label>
            <span className="label mb-1 block text-[11px] text-muted">Kdo</span>
            <select name="employee_id" defaultValue={sp.zamestnanec ?? emps.find((e) => e.user_id === admin.id)?.id ?? ""} className="min-h-9 w-auto py-1">
              {emps.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span className="label mb-1 block text-[11px] text-muted">Den</span>
          <input name="day" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="min-h-9 w-auto py-1" />
        </label>
        <label>
          <span className="label mb-1 block text-[11px] text-muted">Druh</span>
          <select name="kind" defaultValue="prace" className="min-h-9 w-auto py-1">
            {(Object.keys(ATTENDANCE_KIND_LABEL) as AttendanceKind[]).map((k) => (
              <option key={k} value={k}>
                {ATTENDANCE_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label mb-1 block text-[11px] text-muted">Od</span>
          <input name="from" type="time" className="min-h-9 w-auto py-1" />
        </label>
        <label>
          <span className="label mb-1 block text-[11px] text-muted">Do</span>
          <input name="to" type="time" className="min-h-9 w-auto py-1" />
        </label>
        <label>
          <span className="label mb-1 block text-[11px] text-muted">nebo hodin</span>
          <input name="hours" type="number" min={0} step="0.25" placeholder="8" className="min-h-9 w-20 py-1" />
        </label>
        <label className="min-w-[160px] flex-1">
          <span className="label mb-1 block text-[11px] text-muted">Poznámka</span>
          <input name="note" placeholder="rozvoz, úklid, lékař…" className="min-h-9 py-1" />
        </label>
        <Button type="submit" className="min-h-9">
          Přidat
        </Button>
      </form>
      {!admin.isManager && emps.length === 0 && <p className="mt-2 text-xs text-muted">Nejste zatím propojeni se zaměstnancem, záznamy se ukládají k vašemu přihlášení a správce je dopojí.</p>}

      <div className="mt-4">
        {list.length === 0 ? (
          <p className="text-muted">V tomto měsíci žádný záznam.</p>
        ) : (
          <Table head={admin.isManager ? ["Den", "Kdo", "Druh", "Od", "Do", "Hodin", "Zdroj", "Poznámka", ""] : ["Den", "Druh", "Od", "Do", "Hodin", "Zdroj", "Poznámka"]}>
            {list.map((r) => (
              <tr key={r.id}>
                <Td className="whitespace-nowrap">{formatDay(r.day)}</Td>
                {admin.isManager && <Td>{r.employee_id ? empName.get(r.employee_id) ?? "—" : <span className="text-brick-text">nepropojeno</span>}</Td>}
                <Td>{ATTENDANCE_KIND_LABEL[r.kind]}</Td>
                <Td className="text-muted">{r.started_at ? new Date(r.started_at).toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" }) : "—"}</Td>
                <Td className="text-muted">{r.ended_at ? new Date(r.ended_at).toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" }) : r.started_at ? "běží" : "—"}</Td>
                <Td>{r.hours !== null ? fmtH(Number(r.hours)) : "—"}</Td>
                <Td>
                  <span className={`label rounded-full px-2 py-0.5 text-[10px] ${r.source === "kasa" ? "border border-line text-muted" : "bg-ochre-badge text-ink"}`}>{r.source === "kasa" ? "Kasa" : "Ručně"}</span>
                </Td>
                <Td className="text-muted">
                  {r.note}
                  {r.break_minutes ? <span className="block text-xs">pauza {r.break_minutes} min</span> : null}
                </Td>
                {admin.isManager && (
                  <Td className="text-right">
                    {r.source === "rucne" && (
                      <ConfirmButton action={deleteAttendance} fields={{ id: r.id }} title="Smazat záznam?" text="Ruční záznam docházky zmizí, do deníku změn se zapíše, kdo ho smazal." confirmLabel="Smazat" variant="ghost" className="min-h-7 px-2 text-[10px]">
                        Smazat
                      </ConfirmButton>
                    )}
                  </Td>
                )}
              </tr>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}
