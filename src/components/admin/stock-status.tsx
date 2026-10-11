import { STOCK_STATUS_LABEL, type StockStatus } from "@/lib/stock-analysis";

const styles: Record<StockStatus, string> = {
  ok: "bg-green text-cream",
  low: "bg-ochre-badge text-ink",
  slow: "border border-ochre bg-white text-ink",
  dead: "bg-brick text-white",
  out: "border border-line bg-paper text-muted",
};

/** Štítek stavu zásoby: Prodává se / Pomalé / Ležák / Docházející / Vyprodáno. */
export function StockStatusBadge({ status }: { status: StockStatus }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-control px-2 py-0.5 text-small font-semibold ${styles[status]}`}>{STOCK_STATUS_LABEL[status]}</span>;
}
