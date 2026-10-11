import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

/** Drobečková navigace: jen na detailu a podstránkách. Poslední položka bez odkazu v ink. */
export function Breadcrumb({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Drobečková navigace" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-muted">
      {items.map((item, i) => (
        <Fragment key={`${item.label}-${i}`}>
          {i > 0 && <ChevronRight className="size-2.25" strokeWidth={2.5} aria-hidden />}
          {item.href ? (
            <Link href={item.href} className="hover:text-brick-text hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink" aria-current="page">
              {item.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
