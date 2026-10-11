import Link from "next/link";
import { chipClass } from "@/components/ui/field";

/** Dlaždice s číslem pro Dnes, Sklad, Statistiky, Finance. Jedna komponenta pro celý admin. */
export function Stat({ label, value, sub, href, warn, small }: { label: string; value: React.ReactNode; sub?: React.ReactNode; href?: string; warn?: boolean; small?: boolean }) {
  const cls = `block rounded-card border bg-white p-5 shadow-card transition-[border-color,box-shadow] duration-300 ${warn ? "border-brick" : "border-line"} ${href ? "hover:border-brick hover:shadow-card-hover" : ""}`;
  const body = (
    <>
      <p className={`text-eyebrow uppercase ${warn ? "text-brick-text" : "text-muted"}`}>{label}</p>
      <p className={`${small ? "text-price" : "text-price-lg"} ${warn ? "text-brick-text" : "text-green"}`}>{value}</p>
      {sub && <p className="mt-1 text-small">{sub}</p>}
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Volby pohledu a období (K vyřízení / Hotové, 30 dní / 90 dní) jako řádek chipů. */
export function Pills({ items }: { items: { href: string; label: string; on: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-1.25">
      {items.map((p) => (
        <Link key={p.href + p.label} href={p.href} aria-current={p.on ? "page" : undefined} className={chipClass(p.on)}>
          {p.label}
        </Link>
      ))}
    </div>
  );
}
