import { LINES, LINE_INFO, MEATS, MEAT_LABEL, type LineSlug, type MeatKey, type Product } from "@/lib/catalog";

export type MenuMeat = { key: MeatKey; label: string; count: number; image: string | null };
export type MenuLine = { slug: LineSlug; name: string; tagline: string; href: string; meats: MenuMeat[] };

/** Data pro menu řad s druhy masa: jen druhy, které v řadě opravdu jsou, s obrázkem prvního produktu. */
export function buildCategoryMenu(products: Product[]): MenuLine[] {
  return LINES.map((slug) => {
    const inLine = products.filter((p) => p.line === slug);
    const meats = MEATS.map((key) => {
      const hits = inLine.filter((p) => p.meats?.includes(key));
      return { key, label: MEAT_LABEL[key], count: hits.length, image: hits.find((p) => p.image)?.image ?? null };
    }).filter((m) => m.count > 0);
    return { slug, name: LINE_INFO[slug].name, tagline: LINE_INFO[slug].tagline, href: `/rada/${slug}`, meats };
  });
}

/** Které kombinace řada × druh masa existují (pro statické podstránky a sitemap). */
export function lineMeatPairs(products: Product[]): { line: LineSlug; meat: MeatKey }[] {
  return buildCategoryMenu(products).flatMap((l) => l.meats.map((m) => ({ line: l.slug, meat: m.key })));
}
