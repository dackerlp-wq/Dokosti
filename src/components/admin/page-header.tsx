import { Breadcrumb } from "@/components/ui/breadcrumb";

export type Crumb = { href?: string; label: string };

/** Jednotná hlavička pracovních obrazovek: jednoznačný název, stručná nápověda a hlavní akce. */
export function PageHeader({ title, subtitle, crumbs, actions, badges }: { title: React.ReactNode; subtitle?: React.ReactNode; crumbs?: Crumb[]; actions?: React.ReactNode; badges?: React.ReactNode }) {
  return (
    <div>
      {crumbs && crumbs.length > 0 && (
        <div className="mb-2.5">
          <Breadcrumb items={crumbs} />
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-sans text-3xl font-bold tracking-tight text-green">{title}</h1>
            {badges}
          </div>
          {subtitle && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
