import type { Metadata } from "next";
import Link from "next/link";
import { markExpensePaid, saveExpense, saveRecurring } from "@/app/admin/(app)/finance/actions";
import { PageHeader } from "@/components/admin/page-header";
import { Pills, Stat } from "@/components/admin/stat";
import { StockFilters } from "@/components/admin/stock-filters";
import { Table, Td } from "@/components/admin/table";
import { Button, buttonClass } from "@/components/ui/button";
import { EXPENSE_CATEGORY_LABEL, EXPENSE_SOURCE_LABEL, formatDay, isMonth, monthLabel, shiftMonth, type ExpenseCategory, type ExpenseRow, type RecurringExpenseRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Výdaje" };

const isCategory = (v: string): v is ExpenseCategory => v in EXPENSE_CATEGORY_LABEL;

/** Všechny výdaje na jednom místě: z příjemek, z mezd, opakované a ruční. Zaplaceno jedním klikem. */
export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ mesic?: string; kategorie?: string; pohled?: string; q?: string; novy?: string; opakovane?: string }> }) {
  await requireManager();
  const sp = await searchParams;
  const current = new Date().toISOString().slice(0, 7);
  const today = new Date().toISOString().slice(0, 10);
  const month = sp.pohled === "neplaceno" || sp.pohled === "vse" ? null : isMonth(sp.mesic) ? sp.mesic : current;
  const db = await getAuthSupabase();
  let q = db.from("expenses").select("*").order("day", { ascending: false }).order("created_at", { ascending: false }).limit(500);
  if (month) q = q.gte("day", `${month}-01`).lte("day", `${month}-31`);
  if (sp.pohled === "neplaceno") q = q.is("paid_at", null);
  if (sp.kategorie && isCategory(sp.kategorie)) q = q.eq("category", sp.kategorie);
  if (sp.q) q = q.or(`description.ilike.%${sp.q}%,supplier.ilike.%${sp.q}%,document_no.ilike.%${sp.q}%`);
  const [{ data }, { data: rec }, { data: unpaidAll }] = await Promise.all([q, db.from("recurring_expenses").select("*").order("day_of_month"), db.from("expenses").select("amount_czk, due_on").is("paid_at", null)]);
  const rows = (data ?? []) as ExpenseRow[];
  const recurring = (rec ?? []) as RecurringExpenseRow[];
  const total = rows.reduce((n, r) => n + Number(r.amount_czk), 0);
  const unpaid = (unpaidAll ?? []) as { amount_czk: number; due_on: string | null }[];
  const unpaidSum = unpaid.reduce((n, r) => n + Number(r.amount_czk), 0);
  const overdue = unpaid.filter((r) => r.due_on && r.due_on < today).reduce((n, r) => n + Number(r.amount_czk), 0);
  const byCat = new Map<string, number>();
  for (const r of rows) byCat.set(r.category, (byCat.get(r.category) ?? 0) + Number(r.amount_czk));
  const base = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ mesic: sp.mesic, kategorie: sp.kategorie, pohled: sp.pohled, q: sp.q, ...p })) if (v) u.set(k, v);
    const s = u.toString();
    return `/admin/finance/vydaje${s ? `?${s}` : ""}`;
  };
  const m = month ?? current;

  return (
    <>
      <PageHeader
        title="Výdaje"
        subtitle="Zboží z příjemek, mzdy a odvody z uzavřených měsíců, nájem a energie z opakovaných výdajů, zbytek ručně (účtenka, servis, vybavení). Finance z toho počítají výsledek."
        actions={
          <>
            <Link href={base({ opakovane: "1", novy: undefined })} className={buttonClass("secondary")}>
              Opakované výdaje · {recurring.filter((r) => r.active).length}
            </Link>
            <Link href={base({ novy: "1", opakovane: undefined })} className={buttonClass("primary")}>
              Zapsat výdaj
            </Link>
          </>
        }
      />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={month ? `Výdaje · ${monthLabel(month)}` : sp.pohled === "neplaceno" ? "Nezaplacené" : "Výdaje · vše"} value={formatPrice(total)} sub={`${rows.length} položek`} small />
        <Stat label="Nezaplaceno celkem" value={formatPrice(unpaidSum)} href={base({ pohled: "neplaceno" })} small />
        <Stat label="Po splatnosti" value={formatPrice(overdue)} warn={overdue > 0} href="/admin/finance/splatnosti" small />
        <Stat label="Největší kategorie" value={[...byCat.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ? EXPENSE_CATEGORY_LABEL[[...byCat.entries()].sort((a, b) => b[1] - a[1])[0][0] as ExpenseCategory] : "—"} small />
      </div>

      {sp.novy && (
        <form action={saveExpense} className="mt-4 rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[18px]">Nový výdaj</h2>
            <Link href={base({ novy: undefined })} className="text-sm text-muted hover:underline">
              zavřít
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block lg:col-span-2">
              <span className="label mb-1 block text-[11px] text-muted">Co</span>
              <input name="description" required placeholder="např. Servis mrazáku, Sáčky a obaly" />
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Kategorie</span>
              <select name="category" defaultValue="sluzby">
                {(Object.keys(EXPENSE_CATEGORY_LABEL) as ExpenseCategory[]).filter((k) => !["mzdy", "odvody"].includes(k)).map((k) => (
                  <option key={k} value={k}>
                    {EXPENSE_CATEGORY_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Částka (Kč, s DPH)</span>
              <input name="amount_czk" type="number" min={0} step="0.01" required />
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Datum</span>
              <input name="day" type="date" defaultValue={today} required />
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Dodavatel</span>
              <input name="supplier" />
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Číslo dokladu</span>
              <input name="document_no" />
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Splatnost (když není zaplaceno)</span>
              <input name="due_on" type="date" />
            </label>
            <label className="block sm:col-span-2 lg:col-span-3">
              <span className="label mb-1 block text-[11px] text-muted">Poznámka</span>
              <input name="note" />
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" name="paid" value="1" defaultChecked className="h-4 w-4" />
              Už zaplaceno
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button type="submit" className="min-h-9">
              Uložit výdaj
            </Button>
            <span className="text-xs text-muted">
              Účtenku nebo fakturu uložte do{" "}
              <Link href="/admin/dokumenty?novy=1" className="text-green underline">
                Dokumentů
              </Link>{" "}
              (kategorie Faktury), zboží od dodavatele zapisujte příjemkou, ne sem.
            </span>
          </div>
        </form>
      )}

      {sp.opakovane && (
        <section className="mt-4 rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[18px]">Opakované výdaje</h2>
            <Link href={base({ opakovane: undefined })} className="text-sm text-muted hover:underline">
              zavřít
            </Link>
          </div>
          <p className="mb-3 text-sm text-muted">Nájem, energie, software, pojištění. Každý měsíc v zadaný den vznikne výdaj k zaplacení (denní cron), po zaplacení ho odškrtnete.</p>
          {recurring.length > 0 && (
            <Table head={["Název", "Kategorie", "Částka", "Den", "Dodavatel", "Stav", ""]}>
              {recurring.map((r) => (
                <tr key={r.id} className={r.active ? "" : "text-muted"}>
                  <Td>{r.name}</Td>
                  <Td>{EXPENSE_CATEGORY_LABEL[r.category]}</Td>
                  <Td className="text-right">{formatPrice(Number(r.amount_czk))}</Td>
                  <Td>{r.day_of_month}.</Td>
                  <Td>{r.supplier || "—"}</Td>
                  <Td>{r.active ? `aktivní${r.last_generated_month ? `, naposledy ${monthLabel(r.last_generated_month)}` : ""}` : "vypnutý"}</Td>
                  <Td className="text-right">
                    <form action={saveRecurring} className="inline">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="name" value={r.name} />
                      <input type="hidden" name="category" value={r.category} />
                      <input type="hidden" name="amount_czk" value={String(r.amount_czk)} />
                      <input type="hidden" name="day_of_month" value={String(r.day_of_month)} />
                      <input type="hidden" name="supplier" value={r.supplier} />
                      <input type="hidden" name="note" value={r.note} />
                      <input type="hidden" name="active" value={r.active ? "0" : "1"} />
                      <button type="submit" className="text-sm text-green hover:underline">
                        {r.active ? "vypnout" : "zapnout"}
                      </button>
                    </form>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
          <form action={saveRecurring} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <label className="block lg:col-span-2">
              <span className="label mb-1 block text-[11px] text-muted">Nový opakovaný výdaj</span>
              <input name="name" required placeholder="např. Nájem prodejny" className="min-h-9 py-1" />
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Kategorie</span>
              <select name="category" defaultValue="najem" className="min-h-9 py-1">
                {(Object.keys(EXPENSE_CATEGORY_LABEL) as ExpenseCategory[]).filter((k) => !["zbozi", "mzdy", "odvody"].includes(k)).map((k) => (
                  <option key={k} value={k}>
                    {EXPENSE_CATEGORY_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Částka (Kč)</span>
              <input name="amount_czk" type="number" min={0} step="1" required className="min-h-9 py-1" />
            </label>
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Den v měsíci</span>
              <input name="day_of_month" type="number" min={1} max={28} defaultValue={1} className="min-h-9 py-1" />
            </label>
            <div className="flex items-end">
              <Button type="submit" variant="secondary" className="min-h-9">
                Přidat
              </Button>
            </div>
          </form>
        </section>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Pills
          items={[
            { href: base({ pohled: undefined, mesic: shiftMonth(m, -1) }), label: "‹", on: false },
            { href: base({ pohled: undefined, mesic: m }), label: monthLabel(m), on: !!month },
            ...(m < current ? [{ href: base({ pohled: undefined, mesic: shiftMonth(m, 1) }), label: "›", on: false }] : []),
            { href: base({ pohled: "neplaceno", mesic: undefined }), label: "Nezaplacené", on: sp.pohled === "neplaceno" },
            { href: base({ pohled: "vse", mesic: undefined }), label: "Vše", on: sp.pohled === "vse" },
          ]}
        />
        <StockFilters
          action="/admin/finance/vydaje"
          hidden={{ mesic: sp.mesic, pohled: sp.pohled }}
          search={{ name: "q", value: sp.q, placeholder: "Hledat popis, dodavatele, doklad" }}
          selects={[{ name: "kategorie", value: sp.kategorie, label: "Kategorie", options: [{ value: "", label: "Všechny kategorie" }, ...(Object.keys(EXPENSE_CATEGORY_LABEL) as ExpenseCategory[]).map((k) => ({ value: k, label: `${EXPENSE_CATEGORY_LABEL[k]}${byCat.get(k) ? ` · ${formatPrice(byCat.get(k)!)}` : ""}` }))] }]}
        >
          <a href={`/admin/export/vydaje.csv${month ? `?mesic=${month}` : ""}`} className="label min-h-9 inline-flex items-center rounded-[var(--radius-control)] border border-line px-3 text-[11px] text-green">
            Export CSV
          </a>
        </StockFilters>
      </div>

      <div className="mt-4">
        {rows.length === 0 ? (
          <p className="text-muted">Žádné výdaje. Příjemky se sem propisují samy, ostatní zapište tlačítkem nahoře.</p>
        ) : (
          <Table head={["Datum", "Výdaj", "Kategorie", "Zdroj", "Splatnost", "Částka", ""]}>
            {rows.map((r) => {
              const late = !r.paid_at && r.due_on && r.due_on < today;
              return (
                <tr key={r.id}>
                  <Td className="whitespace-nowrap text-muted">{formatDay(r.day)}</Td>
                  <Td>
                    <span className="font-semibold">{r.description}</span>
                    {(r.supplier || r.document_no) && <div className="text-xs text-muted">{[r.supplier, r.document_no].filter(Boolean).join(" · ")}</div>}
                    {r.note && <div className="max-w-md truncate text-xs italic text-muted">{r.note}</div>}
                  </Td>
                  <Td>{EXPENSE_CATEGORY_LABEL[r.category]}</Td>
                  <Td className="text-muted">
                    {r.source_type === "receipt" && r.source_id ? (
                      <Link href={`/admin/sklad/prijemky#${r.source_id}`} className="text-green hover:underline">
                        Příjemka
                      </Link>
                    ) : r.source_type === "payroll" ? (
                      <Link href={`/admin/mzdy?mesic=${r.source_id?.slice(0, 7)}`} className="text-green hover:underline">
                        Mzdy
                      </Link>
                    ) : (
                      EXPENSE_SOURCE_LABEL[r.source_type]
                    )}
                  </Td>
                  <Td className={`whitespace-nowrap ${late ? "font-semibold text-brick-text" : "text-muted"}`}>{r.paid_at ? `zaplaceno ${formatDay(r.paid_at.slice(0, 10))}` : r.due_on ? `do ${formatDay(r.due_on)}` : "nezaplaceno"}</Td>
                  <Td className="whitespace-nowrap text-right font-semibold">{formatPrice(Number(r.amount_czk))}</Td>
                  <Td className="text-right">
                    <form action={markExpensePaid} className="inline">
                      <input type="hidden" name="id" value={r.id} />
                      {r.paid_at && <input type="hidden" name="undo" value="1" />}
                      <button type="submit" className={`text-sm hover:underline ${r.paid_at ? "text-muted" : "text-green"}`}>
                        {r.paid_at ? "vrátit" : "zaplaceno"}
                      </button>
                    </form>
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </div>
    </>
  );
}
