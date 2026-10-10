import { formatPrice } from "@/lib/format";

export type FinanceBar = { month: string; label: string; revenue: number; costs: number; profit: number; current?: boolean };

/**
 * Měsíce vedle sebe: tržby (zelená) a náklady (cihlová) jako dvojice sloupců, výsledek jako číslo nad nimi.
 * Jedna osa, server SVG bez knihoven. Tabulka s čísly je pod grafem na stránce.
 */
export function FinanceChart({ bars }: { bars: FinanceBar[] }) {
  const n = bars.length;
  const W = 720;
  const H = 240;
  const L = 56;
  const R = 10;
  const T = 26;
  const B = 28;
  const plotH = H - T - B;
  const max = Math.max(1000, ...bars.map((b) => Math.max(b.revenue, b.costs)));
  const slot = (W - L - R) / n;
  const bw = Math.min(22, slot * 0.34);
  const y = (v: number) => T + plotH - (v / max) * plotH;
  const fmtAxis = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)} tis.` : String(Math.round(v)));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tržby a náklady po měsících" className="block h-auto w-full">
      <title>Tržby a náklady po měsících</title>
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(max * t)} y2={y(max * t)} className="stroke-line" />
          <text x={L - 6} y={y(max * t) + 4} textAnchor="end" fontSize={10} className="fill-muted">
            {fmtAxis(max * t)}
          </text>
        </g>
      ))}
      {bars.map((b, i) => {
        const cx = L + slot * i + slot / 2;
        const rev = y(b.revenue);
        const cost = y(b.costs);
        return (
          <g key={b.month}>
            <title>{`${b.label}: tržby ${formatPrice(b.revenue)}, náklady ${formatPrice(b.costs)}, výsledek ${formatPrice(b.profit)}`}</title>
            {b.current && <rect x={cx - slot / 2 + 2} y={T - 4} width={slot - 4} height={plotH + 4} rx={4} className="fill-cream" />}
            <rect x={cx - bw - 1} y={rev} width={bw} height={Math.max(0, y(0) - rev)} rx={3} className="fill-green" />
            <rect x={cx + 1} y={cost} width={bw} height={Math.max(0, y(0) - cost)} rx={3} className="fill-brick" />
            <text x={cx} y={Math.min(rev, cost) - 6} textAnchor="middle" fontSize={10} fontWeight={600} className={b.profit < 0 ? "fill-brick-text" : "fill-ink"}>
              {b.revenue + b.costs > 0 ? `${b.profit < 0 ? "−" : ""}${fmtAxis(Math.abs(b.profit))}` : ""}
            </text>
            <text x={cx} y={H - 10} textAnchor="middle" fontSize={10} className={b.current ? "fill-ink" : "fill-muted"} fontWeight={b.current ? 600 : 400}>
              {b.label}
            </text>
          </g>
        );
      })}
      <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} className="stroke-muted" />
      <g fontSize={10} className="fill-muted">
        <rect x={L} y={6} width={10} height={10} rx={2} className="fill-green" />
        <text x={L + 14} y={15}>
          Tržby
        </text>
        <rect x={L + 60} y={6} width={10} height={10} rx={2} className="fill-brick" />
        <text x={L + 74} y={15}>
          Náklady
        </text>
        <text x={L + 140} y={15}>
          Číslo nad sloupci = výsledek měsíce
        </text>
      </g>
    </svg>
  );
}
