import { Beef, Bone, Calculator, Cookie, CookingPot, Droplet, Heart, Leaf, Snowflake, Soup, Store, Truck, type LucideIcon } from "lucide-react";
import { ProductCarousel } from "@/components/product/product-grid";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import { LinkArrow } from "@/components/ui/link-arrow";
import { Logo } from "@/components/ui/logo";
import { Section, SectionHeader } from "@/components/ui/section";
import { LINES, LINE_INFO, type LineSlug } from "@/lib/catalog";
import { getProducts } from "@/lib/products";
import { SITE_URL } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

/** Ikona řady v rozcestníku a mega menu. Kost je motiv loga, smí označovat řady krmiva. */
const LINE_ICON: Record<LineSlug, LucideIcon> = { barf: Soup, maso: Beef, kosti: Bone, mlsky: Cookie, navic: Droplet, granule: CookingPot };

export default async function HomePage() {
  const [products, { shop }] = await Promise.all([getProducts(), getSettings()]);
  const business = {
    "@context": "https://schema.org",
    "@type": "PetStore",
    name: shop.name,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/dokosti-profilovka.png`,
    telephone: shop.phone.startsWith("[") ? undefined : shop.phone,
    email: shop.email.includes("@") ? shop.email : undefined,
    address: shop.address.startsWith("[") ? undefined : { "@type": "PostalAddress", streetAddress: shop.address, addressLocality: shop.city, addressCountry: "CZ" },
  };
  const featured = products.filter((p) => p.inStock && p.unit !== "kg").slice(0, 8);

  return (
    <>
      <JsonLd data={business} />

      {/* Hero na bílé: fotka vlevo, text vpravo. Dokud není fotka psa se surovinami, stojí tu logo na krémovém disku. */}
      <section className="mx-auto flex max-w-site flex-col items-center gap-7.5 px-5 py-10 text-center md:flex-row md:py-15 md:text-left">
        <div className="flex flex-1 justify-center">
          <div className="flex size-64 items-center justify-center rounded-full bg-cream md:size-[420px]" role="img" aria-label="DoKosti BARF">
            <Logo variant="barevne" width={260} priority className="w-[62%]" />
          </div>
        </div>
        <div className="max-w-[570px] flex-1">
          <p className="text-eyebrow text-muted uppercase">Syrové krmivo pro psy a kočky</p>
          <h1 className="mb-7.5 font-display text-display-lg text-green md:text-display-xl">Poctivé do kosti.</h1>
          <p className="mb-7.5">
            Hotové BARF mixy, masité kosti a doplňky od ověřených výrobců. <strong>Víme, co je v každém balíčku</strong>, a řekneme to na rovinu.
          </p>
          <div className="flex flex-wrap justify-center gap-5 md:justify-start">
            <ButtonLink href="/rada/barf" variant="action" size="md">
              Vybrat krmivo
            </ButtonLink>
            <ButtonLink href="/doprava" variant="secondary" size="md">
              Jak doručujeme
            </ButtonLink>
          </div>
        </div>
      </section>

      <Section tone="paper">
        <SectionHeader eyebrow="Nabídka" title="Šest řad, jasný systém" />
        <div className="grid gap-x-5 gap-y-7.5 xs:grid-cols-2 lg:grid-cols-3">
          {LINES.map((slug) => {
            const line = LINE_INFO[slug];
            return (
              <IconTile
                key={slug}
                icon={LINE_ICON[slug]}
                title={line.name}
                text={line.tagline}
                href={`/rada/${slug}`}
                action={
                  <ButtonLink href={`/rada/${slug}`} size="sm">
                    Vybrat
                  </ButtonLink>
                }
              />
            );
          })}
        </div>
      </Section>

      <Section>
        <SectionHeader eyebrow="Z čeho to je" title="Maso, kosti, vnitřnosti a to navíc" />
        <div className="grid gap-x-5 gap-y-7.5 xs:grid-cols-2 xl:grid-cols-4">
          <IconTile icon={Beef} title="Maso" text="Svalovina je základ každého mixu a největší část denní dávky." />
          <IconTile icon={Bone} title="Kosti" text="Masité kosti, vždy syrové, nikdy vařené. Velikost podle psa." />
          <IconTile icon={Heart} title="Vnitřnosti" text="Játra, srdce, žaludky. Menší část dávky, podle složení na etiketě." />
          <IconTile icon={Leaf} title="Doplňky" text="Oleje, byliny, zelenina a vaječné skořápky. Dávkují se po lžičkách." />
        </div>
      </Section>

      {/* Jediná teplá (cream) sekce na stránce. */}
      <Section tone="cream">
        <div className="flex flex-col items-center gap-7.5 text-center md:flex-row md:text-left">
          <div className="flex flex-1 justify-center">
            <span className="flex size-48 items-center justify-center rounded-full bg-white text-green md:size-64" aria-hidden>
              <Calculator className="size-20 md:size-24" strokeWidth={1.25} />
            </span>
          </div>
          <div className="max-w-[570px] flex-1">
            <p className="text-eyebrow text-muted uppercase">Krmení na míru</p>
            <h2 className="mb-7.5 font-display text-display-md text-green md:text-display-lg">Plán pro vašeho psa za dvě minuty</h2>
            <p className="mb-7.5">Sedm otázek o vašem zvířeti, my spočítáme dávku, složíme dodávku z naší nabídky a řekneme cenu za den. Pošleme pravidelně, nebo jen jednou. Bez závazku.</p>
            <div className="flex flex-wrap justify-center gap-5 md:justify-start">
              <ButtonLink href="/krmeni-na-miru" size="md">
                Sestavit plán
              </ButtonLink>
              <ButtonLink href="/kalkulacka" variant="secondary" size="md">
                Jen spočítat dávku
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeader eyebrow="Skladem" title="Z mrazáku rovnou k vám" more={<LinkArrow href="/rada/barf">Vše z řady</LinkArrow>} />
        <ProductCarousel products={featured} label="Produkty skladem" />
      </Section>

      <Section tone="paper">
        <SectionHeader eyebrow="Doručení" title="Mražené dovezeme mražené" />
        <div className="grid gap-x-5 gap-y-7.5 md:grid-cols-3">
          <IconTile icon={Store} title="Osobní odběr" text="Objednáte, připravíme do mrazáku, vyzvednete v prodejně v Kladně." />
          <IconTile icon={Truck} title="Rozvoz po okolí" text="Kladno a okolí vozíme sami v chladicím boxu. Domluvíme den a hodinu." />
          <IconTile icon={Snowflake} title="Chlazený přepravce" text="Po celé ČR v polystyrenu se suchým ledem. Posíláme na začátku týdne." />
        </div>
        <div className="mt-7.5 text-center">
          <LinkArrow href="/doprava">Podrobnosti o doručení</LinkArrow>
        </div>
      </Section>

      <Section>
        <div className="mx-auto flex max-w-narrow flex-col items-center gap-10 text-center md:flex-row md:text-left">
          <div className="flex-1">
            <p className="text-eyebrow text-muted uppercase">O nás</p>
            <h2 className="mb-3.5 font-display text-display-md text-green md:text-display-lg">Prodejna, ne sklad.</h2>
            <p className="mb-3.5">BARF krmíme vlastní zvířata a víme, že začátky bývají zmatek. Proto v prodejně poradíme, spočítáme dávku a nepřemlouváme. BARF není pro každého, a to je v pořádku.</p>
            <p className="mb-5">
              <span className="font-bold text-green">DoKosti BARF</span>, prodejna v Kladně
            </p>
            <LinkArrow href="/o-nas">Víc o prodejně</LinkArrow>
          </div>
          {/* Místo pro kulatou fotku z prodejny. */}
          <div className="flex size-64 shrink-0 items-center justify-center rounded-full bg-cream md:size-[350px]" role="img" aria-label="Znak DoKosti">
            <Logo variant="znak" width={180} className="w-1/2" />
          </div>
        </div>
      </Section>
    </>
  );
}
