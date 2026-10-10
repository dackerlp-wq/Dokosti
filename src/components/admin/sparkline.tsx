/** Malý graf trendu (prodeje po týdnech), bez os a legendy; koncový bod zvýrazněný. */
export function Sparkline({ values, width = 92, height = 26, title }: { values: number[]; width?: number; height?: number; title?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [4 + (i * (width - 8)) / (values.length - 1), height - 3 - (v / max) * (height - 8)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${height - 3} L${pts[0][0].toFixed(1)} ${height - 3} Z`;
  const end = pts[pts.length - 1];
  const flat = values.every((v) => v === 0);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} role="img" aria-label={title ?? "Trend prodejů"} className="block">
      {title && <title>{title}</title>}
      {!flat && <path d={area} className="fill-green opacity-15" />}
      <path d={line} fill="none" strokeWidth={1.5} strokeLinejoin="round" className={flat ? "stroke-line" : "stroke-green"} />
      <circle cx={end[0].toFixed(1)} cy={end[1].toFixed(1)} r={2.5} className={flat ? "fill-line" : "fill-green"} />
    </svg>
  );
}
