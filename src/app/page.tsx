import { Snowflake, Store, Truck } from "lucide-react";
import Link from "next/link";
import { HeroProduct, pickHeroProduct } from "@/components/product/hero-product";
import { ProductGrid } from "@/components/product/product-grid";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Section, SectionHeading } from "@/components/ui/section";
import { LINES, LINE_INFO } from "@/lib/catalog";
import { getProducts } from "@/lib/products";

export default async function HomePage() {
  const products = await getProducts();
  const hero = pickHeroProduct(products);
  const featured = products.filter((p) => p.inStock && p.slug !== hero?.slug).slice(0, 8);

  return (
    <>
      {/* Hero: jediná zelená sekce na stránce (kromě hlavičky a patičky). */}
      <section className="bg-green text-cream">
        <div className="container-dk grid items-center gap-8 py-10 md:grid-cols-[1.2fr_1fr] md:py-14">
          <div>
            <p className="label mb-3 text-cream/80">Syrové krmivo pro psy a kočky</p>
            <h1>Poctivé do kosti.</h1>
            <p className="mt-4 max-w-md text-cream/90">
              Hotové BARF mixy, masité kosti a doplňky od ověřených výrobců. Víme, co je v každém balíčku, a
              řekneme to na rovinu.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/rada/zaklad" variant="action">
                Vybrat krmivo
              </ButtonLink>
              <ButtonLink href="/doprava" variant="ghost">
                Jak doručujeme
              </ButtonLink>
            </div>
          </div>
          {hero && (
            <div className="flex justify-center md:justify-end">
              <HeroProduct product={hero} />
            </div>
          )}
        </div>
      </section>

      <Section tone="cream">
        <SectionHeading eyebrow="Nabídka" title="Pět řad, jasný systém">
          Základ je denní krmení, Kosti na hryzání, Navíc doplní, Mlsky odmění, Granule pro ty, kdo syrově nekrmí.
        </SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {LINES.map((slug) => {
            const line = LINE_INFO[slug];
            return (
              <Link
                key={slug}
                href={`/rada/${slug}`}
                className="group flex flex-col rounded-[var(--radius-card)] border border-line bg-paper p-4 transition-colors hover:border-green"
              >
                <span className="label text-brick-text">Řada</span>
                <h3 className="mt-1 group-hover:underline">{line.name}</h3>
                <p className="mt-1 text-sm text-muted">{line.tagline}</p>
              </Link>
            );
          })}
        </div>
      </Section>

      <Section tone="paper">
        <SectionHeading eyebrow="Skladem" title="Z mrazáku rovnou k vám" />
        <ProductGrid products={featured} />
      </Section>

      <Section tone="cream">
        <SectionHeading eyebrow="Doručení" title="Mražené dovezeme mražené" />
        <div className="grid gap-4 md:grid-cols-3">
          <Feature icon={<Store strokeWidth={1.75} />} title="Osobní odběr">
            Objednáte, připravíme do mrazáku, vyzvednete v prodejně v Kladně.
          </Feature>
          <Feature icon={<Truck strokeWidth={1.75} />} title="Rozvoz po okolí">
            Kladno a okolí vozíme sami v chladicím boxu. Domluvíme den a hodinu.
          </Feature>
          <Feature icon={<Snowflake strokeWidth={1.75} />} title="Chlazený přepravce">
            Po celé ČR v polystyrenu se suchým ledem. Posíláme na začátku týdne.
          </Feature>
        </div>
        <div className="mt-6">
          <ButtonLink href="/doprava" variant="secondary">
            Podrobnosti o doručení
          </ButtonLink>
        </div>
      </Section>

      <Section tone="paper">
        <div className="grid items-center gap-8 md:grid-cols-[1fr_1.4fr]">
          <Logo variant="barevne" width={220} />
          <div>
            <SectionHeading eyebrow="O nás" title="Prodejna, ne sklad" />
            <p className="-mt-2 text-muted">
              BARF krmíme vlastní zvířata a víme, že začátky bývají zmatek. Proto v
              prodejně poradíme, spočítáme dávku a nepřemlouváme. BARF není pro každého, a to je v pořádku.
            </p>
            <div className="mt-6">
              <ButtonLink href="/o-nas" variant="secondary">
                Víc o prodejně
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
      <div className="mb-2 text-green [&_svg]:h-6 [&_svg]:w-6">{icon}</div>
      <h3>{title}</h3>
      <p className="mt-1 text-sm text-muted">{children}</p>
    </div>
  );
}
