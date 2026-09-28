import fs from "node:fs";
import path from "node:path";
import { LINES, LINE_INFO, MEATS, MEAT_LABEL, type LineSlug, type MeatKey, type Product } from "@/lib/catalog";

export type MenuMeat = { key: MeatKey; label: string; count: number; image: string | null; illustration: boolean };
export type MenuLine = { slug: LineSlug; name: string; tagline: string; href: string; meats: MenuMeat[] };

/**
 * Ilustrace druhu masa: soubor public/kategorie/maso-<druh>.png (rytina zvířete, zelená na krémové, 800×800).
 * Když chybí, použije se fotka prvního produktu. Jen na serveru (čte disk).
 */
export function meatIllustration(key: MeatKey): string | null {
  const rel = `/kategorie/maso-${key}.png`;
  return fs.existsSync(path.join(process.cwd(), "public", rel)) ? rel : null;
}

/** Data pro menu řad s druhy masa: jen druhy, které v řadě opravdu jsou, s ilustrací nebo obrázkem prvního produktu. */
export function buildCategoryMenu(products: Product[]): MenuLine[] {
  return LINES.map((slug) => {
    const inLine = products.filter((p) => p.line === slug);
    const meats = MEATS.map((key) => {
      const hits = inLine.filter((p) => p.meats?.includes(key));
      const ill = meatIllustration(key);
      return { key, label: MEAT_LABEL[key], count: hits.length, image: ill ?? hits.find((p) => p.image)?.image ?? null, illustration: Boolean(ill) };
    }).filter((m) => m.count > 0);
    return { slug, name: LINE_INFO[slug].name, tagline: LINE_INFO[slug].tagline, href: `/rada/${slug}`, meats };
  });
}

/** Které kombinace řada × druh masa existují (pro statické podstránky a sitemap). */
export function lineMeatPairs(products: Product[]): { line: LineSlug; meat: MeatKey }[] {
  return buildCategoryMenu(products).flatMap((l) => l.meats.map((m) => ({ line: l.slug, meat: m.key })));
}
