import Link from "next/link";

/** Dlaždice s číslem pro Dnes, Sklad, Statistiky, Finance. Jedna komponenta pro celý admin. */
export function Stat({ label, value, sub, href, warn, small }: { label: string; value: React.ReactNode; sub?: React.ReactNode; href?: string; warn?: boolean; small?: boolean }) {
  const cls = `block rounded-[var(--radius-card)] border bg-paper p-4 ${warn ? "border-brick" : "border-line"} ${href ? "hover:border-green" : ""}`;
  const body = (
    <>
      <p className={`label text-[11px] ${warn ? "text-brick-text" : "text-muted"}`}>{label}</p>
      <p className={`font-display font-semibold leading-tight ${small ? "text-[20px]" : "text-[26px]"} ${warn ? "text-brick-text" : ""}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
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

/** Pilulky pro pohledy a období (K vyřízení / Hotové, 30 dní / 90 dní). */
export function Pills({ items }: { items: { href: string; label: string; on: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((p) => (
        <Link key={p.href + p.label} href={p.href} className={`label inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] ${p.on ? "border-green bg-green text-cream" : "border-line bg-paper text-green hover:border-green"}`}>
          {p.label}
        </Link>
      ))}
    </div>
  );
}
