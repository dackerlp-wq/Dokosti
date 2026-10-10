import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { toggleChecklistItem } from "@/app/admin/(app)/provoz/actions";
import { linkEmployeeUser, saveEmployee } from "@/app/admin/(app)/zamestnanci/actions";
import { PageHeader } from "@/components/admin/page-header";
import { Pills } from "@/components/admin/stat";
import { Table, Td } from "@/components/admin/table";
import { Button, buttonClass } from "@/components/ui/button";
import { ATTENDANCE_KIND_LABEL, CONTRACT_LABEL, DOCUMENT_CATEGORY_LABEL, formatDate, formatDay, type AttendanceRow, type ChecklistRow, type ChecklistRunRow, type ContractType, type DocumentRow, type EmployeeRow } from "@/lib/admin";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Zaměstnanec" };

const TABS = [
  { id: "dochazka", label: "Docházka" },
  { id: "dokumenty", label: "Smlouvy a dokumenty" },
  { id: "udaje", label: "Údaje" },
  { id: "pristup", label: "Přístup" },
  { id: "zaskoleni", label: "Zaškolení" },
] as const;

export default async function EmployeePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ karta?: string; mesic?: string }> }) {
  const admin = await requireManager();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const tab = TABS.find((t) => t.id === sp.karta)?.id ?? "dochazka";
  const month = sp.mesic && /^\d{4}-\d{2}$/.test(sp.mesic) ? sp.mesic : new Date().toISOString().slice(0, 7);
  const db = await getAuthSupabase();
  const [{ data }, { data: att }, { data: docs }, { data: users }, { data: onboarding }, { data: run }] = await Promise.all([
    db.from("employees").select("*").eq("id", id).maybeSingle(),
    db.from("attendance").select("*").eq("employee_id", id).gte("day", `${month}-01`).lte("day", `${month}-31`).order("day", { ascending: false }).order("started_at", { ascending: false }),
    db.from("documents").select("*").eq("linked_type", "employee").eq("linked_id", id).is("archived_at", null).order("created_at", { ascending: false }),
    db.rpc("admin_list"),
    db.from("checklists").select("*").eq("period", "nastup").eq("active", true).limit(1).maybeSingle(),
    db.from("checklist_runs").select("*").eq("period_key", `employee:${id}`),
  ]);
  if (!data) notFound();
  const e = data as EmployeeRow;
  const rows = (att ?? []) as AttendanceRow[];
  const documents = (docs ?? []) as DocumentRow[];
  const accounts = (users ?? []) as { user_id: string; email: string; name: string; role: string }[];
  const checklist = onboarding as ChecklistRow | null;
  const checklistRun = ((run ?? []) as ChecklistRunRow[]).find((r) => r.checklist_id === checklist?.id) ?? null;
  const worked = rows.filter((r) => r.kind === "prace").reduce((n, r) => n + Number(r.hours ?? 0), 0);
  const prevMonth = new Date(`${month}-01T12:00:00`);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const nextMonth = new Date(`${month}-01T12:00:00`);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const monthLabel = new Intl.DateTimeFormat("cs-CZ", { month: "long", year: "numeric" }).format(new Date(`${month}-01T12:00:00`));

  return (
    <>
      <PageHeader
        crumbs={[{ href: "/admin/zamestnanci", label: "Zaměstnanci" }]}
        title={e.name}
        subtitle={`${e.position ? `${e.position} · ` : ""}${CONTRACT_LABEL[e.contract_type]}${e.started_on ? ` · od ${formatDay(e.started_on)}` : ""}${e.ended_on ? ` · ukončeno ${formatDay(e.ended_on)}` : ""}`}
        actions={
          <Link href={`/admin/dokumenty?novy=1&vazba=employee:${e.id}`} className={buttonClass("secondary")}>
            Nahrát smlouvu
          </Link>
        }
      />
      <div className="mt-4">
        <Pills items={TABS.map((t) => ({ href: `/admin/zamestnanci/${id}?karta=${t.id}`, label: t.label, on: tab === t.id }))} />
      </div>

      {tab === "dochazka" && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/zamestnanci/${id}?karta=dochazka&mesic=${prevMonth.toISOString().slice(0, 7)}`} className="label text-[11px] text-green hover:underline">
              ← předchozí
            </Link>
            <span className="label text-[11px]">{monthLabel}</span>
            <Link href={`/admin/zamestnanci/${id}?karta=dochazka&mesic=${nextMonth.toISOString().slice(0, 7)}`} className="label text-[11px] text-green hover:underline">
              další →
            </Link>
            <span className="ml-auto text-sm">
              Odpracováno <b>{worked.toLocaleString("cs-CZ", { maximumFractionDigits: 2 })} h</b>
              {e.hourly_rate_czk ? <span className="text-muted"> · podklad {Math.round(worked * e.hourly_rate_czk).toLocaleString("cs-CZ")} Kč</span> : null}
            </span>
          </div>
          {rows.length === 0 ? (
            <p className="text-muted">V tomto měsíci žádný záznam. Příchod a odchod vzniká otevřením a uzávěrkou směny v kase (po propojení přihlášení), ručně se přidává v Docházce.</p>
          ) : (
            <Table head={["Den", "Druh", "Od", "Do", "Hodin", "Zdroj", "Poznámka"]}>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td className="whitespace-nowrap">{formatDay(r.day)}</Td>
                  <Td>{ATTENDANCE_KIND_LABEL[r.kind]}</Td>
                  <Td className="text-muted">{r.started_at ? new Date(r.started_at).toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" }) : "—"}</Td>
                  <Td className="text-muted">{r.ended_at ? new Date(r.ended_at).toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" }) : r.started_at ? "běží" : "—"}</Td>
                  <Td>{r.hours !== null ? Number(r.hours).toLocaleString("cs-CZ", { maximumFractionDigits: 2 }) : "—"}</Td>
                  <Td>
                    <span className={`label rounded-full px-2 py-0.5 text-[10px] ${r.source === "kasa" ? "border border-line text-muted" : "bg-ochre-badge text-ink"}`}>{r.source === "kasa" ? "Kasa" : "Ručně"}</span>
                  </Td>
                  <Td className="text-muted">{r.note}</Td>
                </tr>
              ))}
            </Table>
          )}
          <p className="text-xs text-muted">
            Ruční záznamy (rozvoz, dovolená, nemoc) přidáte v{" "}
            <Link href={`/admin/dochazka?zamestnanec=${id}`} className="text-green underline">
              Docházce
            </Link>
            .
          </p>
        </div>
      )}

      {tab === "dokumenty" && (
        <div className="mt-4">
          {documents.length === 0 ? (
            <p className="text-muted">Zatím žádný dokument. Nahrajte smlouvu, mzdový výměr, zdravotní průkaz nebo záznam o školení.</p>
          ) : (
            <Table head={["Dokument", "Kategorie", "Platnost", ""]}>
              {documents.map((d) => (
                <tr key={d.id}>
                  <Td>
                    <Link href={`/admin/dokumenty/${d.id}`} className="font-semibold text-green hover:underline">
                      {d.title}
                    </Link>
                  </Td>
                  <Td>{DOCUMENT_CATEGORY_LABEL[d.category]}</Td>
                  <Td className="whitespace-nowrap text-muted">{d.valid_to ? `do ${formatDay(d.valid_to)}` : d.valid_from ? `od ${formatDay(d.valid_from)}` : "bez omezení"}</Td>
                  <Td className="text-right">
                    <Link href={`/admin/dokumenty/${d.id}`} className="text-sm text-green hover:underline">
                      otevřít
                    </Link>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      )}

      {tab === "udaje" && (
        <form action={saveEmployee} className="mt-4 max-w-3xl rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <input type="hidden" name="id" value={e.id} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block sm:col-span-2">
              <span className="label mb-1 block text-[11px] text-muted">Jméno a příjmení</span>
              <input name="name" defaultValue={e.name} required />
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Pozice</span>
              <input name="position" defaultValue={e.position} placeholder="obsluha, jednatelka…" />
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Smlouva</span>
              <select name="contract_type" defaultValue={e.contract_type}>
                {(Object.keys(CONTRACT_LABEL) as ContractType[]).map((c) => (
                  <option key={c} value={c}>
                    {CONTRACT_LABEL[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Hodinová sazba (Kč)</span>
              <input name="hourly_rate_czk" type="number" min={0} step="0.01" defaultValue={e.hourly_rate_czk ?? ""} />
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Měsíční mzda (Kč)</span>
              <input name="monthly_salary_czk" type="number" min={0} step="1" defaultValue={e.monthly_salary_czk ?? ""} />
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Úvazek (h/týden)</span>
              <input name="weekly_hours" type="number" min={0} step="0.5" defaultValue={e.weekly_hours ?? ""} />
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Nástup</span>
              <input name="started_on" type="date" defaultValue={e.started_on ?? ""} />
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Ukončení</span>
              <input name="ended_on" type="date" defaultValue={e.ended_on ?? ""} />
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Telefon</span>
              <input name="phone" defaultValue={e.phone} />
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">E-mail</span>
              <input name="email" type="email" defaultValue={e.email} />
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Datum narození</span>
              <input name="birth_date" type="date" defaultValue={e.birth_date ?? ""} />
            </label>
            <label className="block sm:col-span-2 lg:col-span-3">
              <span className="label mb-1 block text-[11px] text-muted">Adresa</span>
              <input name="address" defaultValue={e.address} />
            </label>
            <label className="block sm:col-span-2">
              <span className="label mb-1 block text-[11px] text-muted">Číslo účtu pro výplatu</span>
              <input name="bank_account" defaultValue={e.bank_account} placeholder="123456789/0100" />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" name="tax_declaration" value="1" defaultChecked={e.tax_declaration} className="h-4 w-4" />
              Podepsal prohlášení poplatníka (sleva na dani)
            </label>
            <label className="block sm:col-span-2 lg:col-span-3">
              <span className="label mb-1 block text-[11px] text-muted">Poznámka</span>
              <textarea name="note" rows={2} defaultValue={e.note} />
            </label>
          </div>
          <p className="mt-3 text-xs text-muted">Osobní údaje vidí jen správce. Sazba, mzda a prohlášení poplatníka jsou podklad pro Mzdy (orientační výpočet), oficiální mzdy počítá účetní.</p>
          <Button type="submit" className="mt-3">
            Uložit
          </Button>
        </form>
      )}

      {tab === "pristup" && (
        <div className="mt-4 grid max-w-3xl gap-4 sm:grid-cols-2">
          <form action={linkEmployeeUser} className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
            <input type="hidden" name="id" value={e.id} />
            <p className="label mb-1 text-[11px] text-muted">Přihlášení do systému</p>
            <select name="user_id" defaultValue={e.user_id ?? ""}>
              <option value="">bez přihlášení</option>
              {accounts.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.name || u.email} · {u.role}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted">Účty se zakládají v Nastavení → Uživatelé. Po propojení se otevření a uzávěrka směny v kase zapisují do docházky tohoto člověka.</p>
            <Button type="submit" variant="secondary" className="mt-3">
              Uložit
            </Button>
          </form>
          <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4 text-sm">
            <p className="label mb-1 text-[11px] text-muted">Role a práva</p>
            <p>{e.user_id ? `Role: ${accounts.find((u) => u.user_id === e.user_id)?.role ?? "?"}` : "Bez přihlášení: nemůže do kasy ani do adminu."}</p>
            <Link href="/admin/uzivatele" className="mt-2 inline-block text-green hover:underline">
              Změnit roli v Uživatelích
            </Link>
          </div>
        </div>
      )}

      {tab === "zaskoleni" && (
        <div className="mt-4 max-w-2xl rounded-[var(--radius-card)] border border-line bg-paper p-4">
          {!checklist ? (
            <p className="text-muted">Checklist zaškolení není nastavený (Provoz → Teploty a checklisty → Upravit checklisty).</p>
          ) : (
            <>
              <p className="label text-[11px] text-muted">{checklist.name}</p>
              <ul className="mt-2 divide-y divide-line">
                {checklist.items.map((it) => {
                  const d = checklistRun?.done?.[it.id];
                  return (
                    <li key={it.id} className="flex items-center gap-3 py-2 text-sm">
                      <form action={toggleChecklistItem}>
                        <input type="hidden" name="checklist_id" value={checklist.id} />
                        <input type="hidden" name="period_key" value={`employee:${e.id}`} />
                        <input type="hidden" name="item_id" value={it.id} />
                        <input type="hidden" name="done" value={d ? "0" : "1"} />
                        <input type="hidden" name="back" value={`/admin/zamestnanci/${e.id}?karta=zaskoleni`} />
                        <button type="submit" aria-label={d ? "Vrátit" : "Hotovo"} className={`flex h-6 w-6 items-center justify-center rounded border ${d ? "border-green bg-green text-cream" : "border-line bg-cream hover:border-green"}`}>
                          {d ? "✓" : ""}
                        </button>
                      </form>
                      <span className={`flex-1 ${d ? "text-muted line-through" : ""}`}>{it.text}</span>
                      {d && (
                        <span className="text-xs text-muted">
                          {d.by} · {formatDate(d.at)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-muted">Odškrtnutí zapíše kdo a kdy ({admin.name}). Po dokončení nahrajte podepsaný záznam o zaškolení do dokumentů zaměstnance.</p>
            </>
          )}
        </div>
      )}
    </>
  );
}
