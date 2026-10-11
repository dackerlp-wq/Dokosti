import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Dlaždice s kulatým ikonovým diskem. Informační podoba: text. Rozcestník: href + action (malé tlačítko).
 * Skládá se po 3–4 do mřížky: grid gap-5 xs:grid-cols-2 xl:grid-cols-4.
 */
export function IconTile({ icon: Icon, title, text, href, action }: { icon: LucideIcon; title: string; text?: string; href?: string; action?: ReactNode }) {
  const disc = "inline-flex size-32 items-center justify-center rounded-full bg-green text-cream transition-colors duration-300";
  const glyph = <Icon className="size-14" strokeWidth={1.5} aria-hidden />;
  return (
    <div className="flex flex-col items-center text-center">
      {href ? (
        <Link href={href} aria-label={title} className={`${disc} hover:bg-green-hover`}>
          {glyph}
        </Link>
      ) : (
        <span className={disc}>{glyph}</span>
      )}
      <h3 className="my-5 text-heading-lg text-green">{title}</h3>
      {text ? <p className="mb-3.5 px-6">{text}</p> : null}
      {action}
    </div>
  );
}
