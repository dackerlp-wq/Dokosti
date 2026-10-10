import Link from "next/link";

export type Crumb = { href?: string; label: string };

/** Hlavička stránky adminu: drobečky, nadpis, podtitul a akce vpravo. Jeden vzor pro seznamy i detaily. */
export function PageHeader({ title, subtitle, crumbs, actions, badges }: { title: React.ReactNode; subtitle?: React.ReactNode; crumbs?: Crumb[]; actions?: React.ReactNode; badges?: React.ReactNode }) {
  return (
    <div>
      {crumbs && crumbs.length > 0 && (
        <p className="label mb-1 text-[11px] text-muted">
          {crumbs.map((c, i) => (
            <span key={i}>
              {i > 0 && " · "}
              {c.href ? (
                <Link href={c.href} className="hover:text-green hover:underline">
                  {c.label}
                </Link>
              ) : (
                c.label
              )}
            </span>
          ))}
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1>{title}</h1>
            {badges}
          </div>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
