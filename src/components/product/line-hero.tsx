import { Beef, Bone, Cookie, CookingPot, Droplet, Soup, type LucideIcon } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { LinkArrow } from "@/components/ui/link-arrow";
import type { Line, LineSlug } from "@/lib/catalog";

const LINE_ICON: Record<LineSlug, LucideIcon> = { barf: Soup, maso: Beef, kosti: Bone, mlsky: Cookie, navic: Droplet, granule: CookingPot };

/** Hero řady na bílé: vlevo ilustrace (druh masa) nebo ikona řady na krémovém disku, vpravo název, podtitulek, odstavec, návody a tlačítko. */
/** lead nahradí podtitulek řady (popis podkategorie). */
export function LineHero({ line, title, illustration, eyebrow, lead }: { line: Line; title: ReactNode; illustration?: string | null; eyebrow?: ReactNode; lead?: string }) {
  const Icon = LINE_ICON[line.slug];
  return (
    <section className="mx-auto flex max-w-site flex-col items-center gap-7.5 px-5 py-10 text-center md:flex-row md:py-15 md:text-left">
      <div className="flex flex-1 justify-center">
        <div className="relative flex size-56 items-center justify-center overflow-hidden rounded-full bg-cream text-green md:size-80" aria-hidden>
          {illustration ? <Image src={illustration} alt="" fill sizes="320px" className="object-contain p-6" /> : <Icon className="size-24 md:size-32" strokeWidth={1.25} />}
        </div>
      </div>
      <div className="max-w-[570px] flex-1">
        <p className="text-eyebrow text-muted uppercase">{eyebrow ?? "Řada"}</p>
        <h1 className="mb-3.5 font-display text-display-lg text-green md:text-display-xl">{title}</h1>
        <p className="mb-3.5 text-heading-md text-green">{lead ?? line.tagline}</p>
        <p className="mb-5">{line.description}</p>
        <ul className="mb-7.5 flex flex-wrap justify-center gap-x-5 gap-y-2.5 md:justify-start">
          <li>
            <LinkArrow href="/jak-zacit-s-barfem">Jak začít</LinkArrow>
          </li>
          <li>
            <LinkArrow href="/doprava">Doručení a skladování</LinkArrow>
          </li>
        </ul>
        <ButtonLink href="/kalkulacka" size="md">
          Spočítat dávku
        </ButtonLink>
      </div>
    </section>
  );
}
