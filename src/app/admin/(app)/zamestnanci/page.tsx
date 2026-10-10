import type { Metadata } from "next";
import Link from "next/link";
import { saveEmployee } from "@/app/admin/(app)/zamestnanci/actions";
import { PageHeader } from "@/components/admin/page-header";
import { Pills } from "@/components/admin/stat";
import { Table, Td } from "@/components/admin/table";
import { Button } from "@/components/ui/button";
import { CONTRACT_LABEL, formatDay, type AttendanceRow, type ContractType, type EmployeeRow } from "@/lib/admin";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Zaměstnanci" };

/** Lidé v provozu: smlouva, sazba, přístup do systému, hodiny tento měsíc. */
export default async function EmployeesPage({ searchParams }: { searchParams: Promise<{ pohled?: string }> }) {
  await requireManager();
  const { pohled } = await searchParams;
  const db = await getAuthSupabase();
  const monthStart = new Date().toISOString().slice(0, 7) + "-01";
  const [{ data }, { data: att }, { data: users }] = await Promise.all([db.from("employees").select("*").order("name"), db.from("attendance").select("employee_id, hours, kind").gte("day", monthStart), db.rpc("admin_list")]);
  const all = (data ?? []) as EmployeeRow[];
  const rows = all.filter((e) => (pohled === "byvali" ? !!e.ended_on : !e.ended_on));
  const hours = new Map<string, number>();
  for (const a of (att ?? []) as Pick<AttendanceRow, "employee_id" | "hours" | "kind">[]) if (a.employee_id && a.kind === "prace") hours.set(a.employee_id, (hours.get(a.employee_id) ?? 0) + Number(a.hours ?? 0));
  const userRole = new Map(((users ?? []) as { user_id: string; role: string }[]).map((u) => [u.user_id, u.role]));

  return (
    <>
      <PageHeader title="Zaměstnanci" subtitle="Kdo u vás pracuje, na jakou smlouvu, s jakým přístupem. Hodiny se berou ze směn v kase a z docházky, mzdy z nich počítá etapa Mzdy." />
      <div className="mt-4">
        <Pills
          items={[
            { href: "/admin/zamestnanci", label: `Aktivní · ${all.filter((e) => !e.ended_on).length}`, on: pohled !== "byvali" },
            { href: "/admin/zamestnanci?pohled=byvali", label: `Bývalí · ${all.filter((e) => !!e.ended_on).length}`, on: pohled === "byvali" },
          ]}
        />
      </div>
      <form action={saveEmployee} className="mt-4 flex flex-wrap items-end gap-2 rounded-[var(--radius-card)] border border-line bg-paper p-3">
        <label className="min-w-[200px] flex-1">
          <span className="label mb-1 block text-[11px] text-muted">Nový zaměstnanec</span>
          <input name="name" required placeholder="Jméno a příjmení" className="min-h-9 py-1" />
        </label>
        <label>
          <span className="label mb-1 block text-[11px] text-muted">Smlouva</span>
          <select name="contract_type" defaultValue="dpp" className="min-h-9 w-auto py-1">
            {(Object.keys(CONTRACT_LABEL) as ContractType[]).map((c) => (
              <option key={c} value={c}>
                {CONTRACT_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="label mb-1 block text-[11px] text-muted">Nástup</span>
          <input name="started_on" type="date" className="min-h-9 w-auto py-1" />
        </label>
        <Button type="submit" className="min-h-9">
          Založit
        </Button>
      </form>
      <div className="mt-4">
        {rows.length === 0 ? (
          <p className="text-muted">{pohled === "byvali" ? "Žádní bývalí zaměstnanci." : "Zatím nikdo. Založte sebe a kolegy, aby se směny v kase počítaly do docházky."}</p>
        ) : (
          <Table head={["Jméno", "Pozice", "Smlouva", "Sazba", "Přístup", "Hodin tento měsíc", "Od"]}>
            {rows.map((e) => (
              <tr key={e.id}>
                <Td>
                  <Link href={`/admin/zamestnanci/${e.id}`} className="font-semibold text-green hover:underline">
                    {e.name}
                  </Link>
                </Td>
                <Td className="text-muted">{e.position || "—"}</Td>
                <Td>{CONTRACT_LABEL[e.contract_type]}</Td>
                <Td className="whitespace-nowrap">{e.hourly_rate_czk ? `${e.hourly_rate_czk} Kč/h` : e.monthly_salary_czk ? `${e.monthly_salary_czk} Kč/měs.` : <span className="text-muted">—</span>}</Td>
                <Td>{e.user_id ? <span className="label rounded-full bg-green px-2 py-0.5 text-[10px] text-cream">{userRole.get(e.user_id) ?? "účet"}</span> : <span className="text-muted">bez přihlášení</span>}</Td>
                <Td>{(hours.get(e.id) ?? 0).toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} h</Td>
                <Td className="text-muted">{e.started_on ? formatDay(e.started_on) : "—"}{e.ended_on ? ` · do ${formatDay(e.ended_on)}` : ""}</Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </>
  );
}
