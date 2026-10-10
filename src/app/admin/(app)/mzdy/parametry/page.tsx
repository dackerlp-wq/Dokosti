import type { Metadata } from "next";
import { saveParams } from "@/app/admin/(app)/mzdy/actions";
import { PageHeader } from "@/components/admin/page-header";
import { Pills } from "@/components/admin/stat";
import { Button } from "@/components/ui/button";
import type { PayrollParams } from "@/lib/payroll";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Parametry mezd" };

const FIELDS: { key: keyof PayrollParams; label: string; hint: string; step?: string }[] = [
  { key: "min_wage_czk", label: "Minimální mzda (Kč/měsíc)", hint: "Dopočet zdravotního u HPP pod minimem." },
  { key: "dpp_limit_czk", label: "Rozhodná částka DPP (Kč/měsíc)", hint: "Od této hrubé mzdy se u dohody o provedení práce platí odvody." },
  { key: "dpc_limit_czk", label: "Rozhodná částka DPČ (Kč/měsíc)", hint: "Totéž pro dohodu o pracovní činnosti." },
  { key: "tax_rate_pct", label: "Daň z příjmu (%)", hint: "Záloha i srážková daň, bez progrese.", step: "0.1" },
  { key: "tax_credit_czk", label: "Sleva na poplatníka (Kč/měsíc)", hint: "Jen při podepsaném prohlášení (karta zaměstnance)." },
  { key: "emp_social_pct", label: "Sociální pojištění zaměstnanec (%)", hint: "", step: "0.1" },
  { key: "emp_health_pct", label: "Zdravotní pojištění zaměstnanec (%)", hint: "", step: "0.1" },
  { key: "er_social_pct", label: "Sociální pojištění zaměstnavatel (%)", hint: "", step: "0.1" },
  { key: "er_health_pct", label: "Zdravotní pojištění zaměstnavatel (%)", hint: "", step: "0.1" },
];

/** Parametry roku pro orientační výpočet mezd. Výchozí hodnoty správce potvrdí s účetní. */
export default async function PayrollParamsPage({ searchParams }: { searchParams: Promise<{ rok?: string }> }) {
  await requireManager();
  const sp = await searchParams;
  const thisYear = new Date().getFullYear();
  const year = /^\d{4}$/.test(sp.rok ?? "") ? Number(sp.rok) : thisYear;
  const db = await getAuthSupabase();
  const [{ data }, { data: all }] = await Promise.all([db.from("payroll_params").select("*").eq("year", year).maybeSingle(), db.from("payroll_params").select("year, verified").order("year", { ascending: false })]);
  const { data: fallback } = data ? { data: null } : await db.from("payroll_params").select("*").order("year", { ascending: false }).limit(1).maybeSingle();
  const p = (data ?? fallback) as PayrollParams | null;
  const years = [...new Set([thisYear + 1, thisYear, ...((all ?? []) as { year: number }[]).map((r) => r.year)])].sort((a, b) => b - a);
  const verifiedYears = new Set(((all ?? []) as { year: number; verified: boolean }[]).filter((r) => r.verified).map((r) => r.year));

  return (
    <>
      <PageHeader title="Parametry mezd" subtitle="Čísla, ze kterých se počítá orientační mzda: minimální mzda, limity dohod, daň a odvody. Výchozí hodnoty jsou orientační, zaškrtněte „potvrzeno účetní“, až je projdete." />
      <div className="mt-4">
        <Pills items={years.map((y) => ({ href: `/admin/mzdy/parametry?rok=${y}`, label: `${y}${verifiedYears.has(y) ? " ✓" : ""}`, on: y === year }))} />
      </div>
      <form action={saveParams} className="mt-4 max-w-3xl rounded-[var(--radius-card)] border border-line bg-paper p-4">
        <input type="hidden" name="year" value={year} />
        {!data && <p className="mb-3 text-sm text-brick-text">Pro rok {year} zatím parametry nejsou{p ? `, předvyplněno z roku ${p.year}` : ""}. Uložením je založíte.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="label mb-1 block text-[11px] text-muted">{f.label}</span>
              <input name={f.key} type="number" min={0} step={f.step ?? "1"} defaultValue={p ? String(p[f.key]) : ""} required />
              {f.hint && <span className="mt-1 block text-xs text-muted">{f.hint}</span>}
            </label>
          ))}
          <label className="block sm:col-span-2">
            <span className="label mb-1 block text-[11px] text-muted">Poznámka</span>
            <input name="note" defaultValue={p?.note ?? ""} placeholder="např. potvrzeno účetní 15. 1." />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="verified" value="1" defaultChecked={!!data && !!p?.verified} className="h-4 w-4" />
            Potvrzeno účetní (zmizí upozornění u mezd)
          </label>
        </div>
        <Button type="submit" className="mt-3">
          Uložit parametry {year}
        </Button>
      </form>
      <p className="mt-3 max-w-3xl text-xs text-muted">Výpočet nezohledňuje progresivní daň, slevy na děti, exekuce, průměrný výdělek pro náhrady ani nemocenskou po 14. dni. To všechno řeší účetní z exportu; tady jde o to vědět dopředu, kolik mzdy budou stát.</p>
    </>
  );
}
