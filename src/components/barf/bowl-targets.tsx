import { type Plan, bowlTargets } from "@/lib/barf";
import { ZASADY } from "@/lib/skladba";

/**
 * Pokročilá verze plánu: skladba misky po složkách v gramech na den a na týden.
 * Jen čísla a doporučení, bez vysvětlování; věta ZASADY zůstává kvůli poctivosti.
 */
export function BowlTargets({ plan, className = "" }: { plan: Plan; className?: string }) {
  const rows = bowlTargets(plan);
  const r = plan.result;
  return (
    <section aria-label="Skladba misky" className={`rounded-card border border-line bg-white p-4.5 md:p-5 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
        <h3 className="text-label text-green">Skladba misky</h3>
        <p className="text-small text-muted tabular-nums">
          {r.kcalPerDay} kcal denně · {r.pct.toLocaleString("cs-CZ", { maximumFractionDigits: 1 })} % hmotnosti · rozmezí {r.rangeGrams[0]}–{r.rangeGrams[1]} g
        </p>
      </div>
      <table className="mt-3 w-full text-small">
        <thead>
          <tr className="border-b border-line text-left text-eyebrow text-muted uppercase">
            <th className="py-1.5 font-semibold">Složka</th>
            <th className="py-1.5 text-right font-semibold">Podíl</th>
            <th className="py-1.5 text-right font-semibold">Denně</th>
            <th className="py-1.5 text-right font-semibold">Týdně</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.key} className="border-b border-line last:border-0">
              <td className="py-2 pr-3">
                <span className="font-semibold text-ink">{t.label}</span>
                {t.hint && <span className="block text-[13px]/[18px] text-muted">{t.hint}</span>}
              </td>
              <td className="py-2 text-right tabular-nums">{t.pct == null ? "" : `${t.pct.toLocaleString("cs-CZ")} %`}</td>
              <td className="py-2 text-right font-semibold text-green tabular-nums">{t.perDay}</td>
              <td className="py-2 text-right tabular-nums">{t.perWeek}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 border-t border-line pt-3 text-[13px]/[20px] text-muted">{ZASADY}</p>
    </section>
  );
}
