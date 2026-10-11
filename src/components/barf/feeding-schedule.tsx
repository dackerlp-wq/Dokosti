import { scheduleWeeks, type Plan } from "@/lib/barf";
import { productName } from "@/lib/catalog";

/** Rozpis krmení po dnech a týdnech: které balení se kdy načne a dojí. Stejný v kalkulačce i v průvodci. */
export function FeedingSchedule({ plan }: { plan: Plan }) {
  const weeks = scheduleWeeks(plan.schedule);
  return (
    <div>
      <p className="text-eyebrow text-muted uppercase">Rozpis po dnech, balení po balení</p>
      <p className="mt-1 text-small">Jedno balení vždy dojezte a teprve pak načněte další. Porce se den ode dne trochu liší, důležitý je součet za týden.</p>
      {weeks.map((week, w) => (
        <table key={w} className="mt-3 w-full text-sm">
          {weeks.length > 1 && <caption className="pb-1 text-left text-label text-green">{w + 1}. týden</caption>}
          <tbody className="divide-y divide-line">
            {week.map((d) => (
              <tr key={d.day}>
                <td className="w-24 py-1.5 pr-2 align-top text-eyebrow text-green uppercase">
                  {d.label}
                  <span className="block text-muted normal-case tracking-normal">{d.weekday}</span>
                </td>
                <td className="py-1.5">
                  {d.items.length === 0 && <span className="text-muted">stavte se pro mix, zrovna nic není skladem</span>}
                  {d.items.map((it, j) => (
                    <div key={j} className="flex justify-between gap-2">
                      <span>
                        {productName(it.product)}
                        {it.note ? <span className="text-muted"> · {it.note}</span> : null}
                      </span>
                      <span className="whitespace-nowrap tabular-nums">{it.grams > 0 ? `${it.grams} g` : ""}</span>
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  );
}

/** Kolik z posledního balení zbyde do příště, k řádku nákupu. */
export function leftoverText(item: { leftoverGrams: number; role: string; periods: number }) {
  if (item.periods > 1 || !["zaklad", "ryba", "kosti", "vnitrnosti"].includes(item.role) || item.leftoverGrams < 50) return null;
  const g = Math.round(item.leftoverGrams / 10) * 10;
  return `z posledního balení zbyde ~${g >= 1000 ? `${(g / 1000).toFixed(1).replace(".", ",")} kg` : `${g} g`} do příště`;
}
