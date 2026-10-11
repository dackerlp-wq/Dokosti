import { Breadcrumb } from "@/components/ui/breadcrumb";

export type Crumb = { href?: string; label: string };

/** Hlavička stránky adminu: drobečky, nadpis v ručním písmu, podtitul a akce vpravo. Jeden vzor pro seznamy i detaily. */
export function PageHeader({ title, subtitle, crumbs, actions, badges }: { title: React.ReactNode; subtitle?: React.ReactNode; crumbs?: Crumb[]; actions?: React.ReactNode; badges?: React.ReactNode }) {
  return (
    <div>
      {crumbs && crumbs.length > 0 && (
        <div className="mb-2.5">
          <Breadcrumb items={crumbs} />
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-display-md text-green">{title}</h1>
            {badges}
          </div>
          {subtitle && <p className="mt-1 text-small">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
      </div>
    </div>
  );
}
