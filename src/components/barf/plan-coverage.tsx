import { Check, CircleAlert, Plus } from "lucide-react";
import { type CoverageRow, type Plan, type Reco, planCoverage } from "@/lib/barf";
import { ZASADY } from "@/lib/skladba";

const ICON = { plan: Check, slozeni: Check, navic: Plus, chybi: CircleAlert } as const;
const TONE = { plan: "text-green", slozeni: "text-green", navic: "text-brick-text", chybi: "text-brick-text" } as const;

/**
 * Co plán obsahuje: kontrolní seznam podle obecných zásad syrového krmení. U každé položky je vidět, čím je pokrytá
 * (produktem v nákupu, nebo složením základu podle výrobce), co doporučujeme přidat a co chybí.
 * Záměrně nic nehodnotí: žádné „vyvážené“ ani „kompletní“, jen co v misce je a co ne.
 */
export function PlanCoverage({ plan, extras = [], className = "" }: { plan: Plan; extras?: Reco[]; className?: string }) {
  const rows: CoverageRow[] = planCoverage(plan, extras);
  if (!plan.items.some((it) => it.role === "zaklad")) return null;
  return (
    <section aria-label="Co plán obsahuje" className={`rounded-card border border-line bg-white p-4.5 md:p-5 ${className}`}>
      <h3 className="text-label text-green">Co do misky patří a čím je to pokryté</h3>
      <ul className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {rows.map((r) => {
          const Icon = ICON[r.status];
          return (
            <li key={r.key} className="flex items-start gap-2.5">
              <Icon className={`mt-0.5 size-4.5 shrink-0 ${TONE[r.status]}`} strokeWidth={1.75} aria-hidden />
              <p className="min-w-0 text-small">
                <span className="font-semibold text-ink">{r.label}</span>
                <span className="sr-only">{r.status === "plan" || r.status === "slozeni" ? ": ano" : ": není v nákupu"}</span>
                <span className="block text-muted">{r.status === "chybi" ? `není v nákupu, patří sem: ${r.detail}` : r.detail}</span>
              </p>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 border-t border-line pt-3 text-[13px]/[20px] text-muted">{ZASADY}</p>
    </section>
  );
}
