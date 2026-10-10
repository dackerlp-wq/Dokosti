/**
 * Graf k produktu: stav zásoby po týdnech (stupňovitá čára s limitem) a prodeje za týden (sloupce).
 * Vykresluje se na serveru jako SVG, bez knihoven.
 */
export function StockChart({ stock, sales, low, unit, weekLabels }: { stock: number[]; sales: number[]; low: number; unit: string; weekLabels: string[] }) {
  const n = stock.length;
  const W = 640;
  const H = 230;
  const L = 44;
  const R = 12;
  const T = 14;
  const B = 26;
  const topH = 118;
  const gap = 22;
  const botH = H - T - B - topH - gap;
  const maxS = Math.max(1, low, ...stock);
  const maxV = Math.max(1, ...sales);
  const x = (i: number) => L + (i * (W - L - R)) / (n - 1);
  const bw = (W - L - R) / n;
  const ys = (v: number) => T + topH - (v / maxS) * topH;
  const yv = (v: number) => T + topH + gap + botH - (v / maxV) * botH;
  const fmt = (v: number) => (unit === "kg" ? v.toLocaleString("cs-CZ", { maximumFractionDigits: 1 }) : String(Math.round(v)));

  const step = stock.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${ys(v).toFixed(1)}${i < n - 1 ? ` L${x(i + 1).toFixed(1)} ${ys(v).toFixed(1)}` : ""}`).join(" ");
  const area = `${step} L${x(n - 1).toFixed(1)} ${ys(0).toFixed(1)} L${x(0).toFixed(1)} ${ys(0).toFixed(1)} Z`;
  const lowY = ys(low);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Stav zásoby a týdenní prodeje" className="block h-auto w-full">
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={ys(maxS * t)} y2={ys(maxS * t)} className="stroke-line" />
          <text x={L - 6} y={ys(maxS * t) + 4} textAnchor="end" fontSize={10} className="fill-muted">
            {fmt(maxS * t)}
          </text>
        </g>
      ))}
      <text x={L} y={T - 4} fontSize={10} fontWeight={600} className="fill-muted">
        SKLADEM ({unit})
      </text>
      <path d={area} className="fill-green opacity-10" />
      <path d={step} fill="none" strokeWidth={2} strokeLinejoin="round" className="stroke-green" />
      {low > 0 && (
        <>
          <line x1={L} x2={W - R} y1={lowY} y2={lowY} strokeDasharray="4 4" className="stroke-ochre" />
          <text x={W - R} y={lowY - 4} textAnchor="end" fontSize={10} className="fill-ochre">
            limit {fmt(low)} {unit}
          </text>
        </>
      )}
      <circle cx={x(n - 1)} cy={ys(stock[n - 1])} r={4} className="fill-green" />
      <text x={x(n - 1) - 8} y={ys(stock[n - 1]) - 8} textAnchor="end" fontSize={11} fontWeight={600} className="fill-ink">
        {fmt(stock[n - 1])} {unit}
      </text>

      <text x={L} y={T + topH + gap - 6} fontSize={10} fontWeight={600} className="fill-muted">
        PRODÁNO ZA TÝDEN ({unit})
      </text>
      <line x1={L} x2={W - R} y1={yv(0)} y2={yv(0)} className="stroke-line" />
      <text x={L - 6} y={yv(maxV) + 4} textAnchor="end" fontSize={10} className="fill-muted">
        {fmt(maxV)}
      </text>
      {sales.map((v, i) => (
        <rect key={i} x={x(i) - bw * 0.3} y={yv(v)} width={bw * 0.6} height={Math.max(0, yv(0) - yv(v))} rx={3} className="fill-olive">
          <title>{`Týden od ${weekLabels[i]}: prodáno ${fmt(v)} ${unit}, skladem na konci ${fmt(stock[i])} ${unit}`}</title>
        </rect>
      ))}
      {weekLabels.map((w, i) =>
        i % 2 ? null : (
          <text key={w} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} className="fill-muted">
            {w}
          </text>
        ),
      )}
    </svg>
  );
}
