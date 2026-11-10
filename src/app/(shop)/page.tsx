import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Beef, Bone, Cookie, CookingPot, Droplet, MapPin, Soup, type LucideIcon } from "lucide-react";
import { DoseTeaser } from "@/components/home/dose-teaser";
import { PromoTile } from "@/components/home/promo-tile";
import { ProductGrid } from "@/components/product/product-grid";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/ui/button";
import { LinkArrow } from "@/components/ui/link-arrow";
import { Logo } from "@/components/ui/logo";
import { LINES, LINE_INFO, productName, type LineSlug } from "@/lib/catalog";
import { calculate, newAnimal } from "@/lib/barf";
import { getProducts } from "@/lib/products";
import { SITE_URL } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { STOCK_PHOTOS } from "@/lib/stock-photos";

/** Ikona řady, dokud řada nemá fotku produktu. */
const LINE_ICON: Record<LineSlug, LucideIcon> = { barf: Soup, maso: Beef, kosti: Bone, mlsky: Cookie, navic: Droplet, granule: CookingPot };

/** Teplé odstíny dlaždic kategorií, aby řada nepůsobila jednolitě. */
const TILE_TONE = ["bg-cream", "bg-sand", "bg-sage", "bg-clay", "bg-stone", "bg-sand"];

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
  // Cena za den: nejlevnější kilo BARF směsi skladem × orientační dávka dospělého psa 15 kg (jen maso, bez doplňků).
  const DOG_KG = 15;
  const dailyGrams = calculate({ ...newAnimal("pes"), weightKg: DOG_KG }).dailyGrams;
  const perKg = products
    .filter((p) => p.line === "barf" && p.inStock && (p.unit === "kg" || p.weightGrams >= 100))
    .map((p) => (p.unit === "kg" ? p.priceCzk : (p.priceCzk * 1000) / p.weightGrams));
  const dailyCost = perKg.length > 0 ? { perDay: Math.ceil((Math.min(...perKg) * dailyGrams) / 1000), dogKg: DOG_KG, dailyGrams } : null;
  // Akční produkty skladem se střídají s cenou za den.
  const sales = products
    .filter((p) => p.inStock && p.unit !== "kg" && p.originalPriceCzk !== undefined && p.originalPriceCzk > p.priceCzk)
    .slice(0, 3)
    .map((p) => ({ href: `/produkt/${p.slug}`, name: productName(p), image: p.image, price: p.priceCzk, original: p.originalPriceCzk! }));
  const lineImage = (slug: LineSlug) => products.find((p) => p.line === slug && p.image);
  const address = shop.address.startsWith("[") ? null : shop.address;
  const phone = shop.phone.startsWith("[") ? null : shop.phone;
  const known = shop.openingHours.filter((h) => !h.hours.startsWith("["));
  // Dokud nejsou doplněné otevírací hodiny, neukazujeme ani samotné „Ne zavřeno“.
  const hours = known.some((h) => h.hours !== "zavřeno") ? known : [];

  return (
    <>
      <JsonLd data={business} />

      {/* Hero: krátký text vlevo, mozaika vpravo. Lidé nakupují očima, textu je málo. */}
      <section className="bg-gradient-to-b from-cream to-paper px-5 pt-10 pb-14">
        <div className="mx-auto flex max-w-site flex-col items-center gap-10 lg:flex-row">
          <div className="flex w-full flex-col gap-5 lg:max-w-[440px]">
            <h1 className="font-display text-[2.75rem] leading-[1.1] font-black text-ink md:text-[3.25rem]">
              Syrové krmení
              <br />
              <span className="font-normal text-brick italic">pro psy a kočky.</span>
            </h1>
            <p className="max-w-[420px] text-[1.0625rem]">Mražené BARF směsi, maso, kosti a pamlsky. Na prodejně v Kladně i s doručením.</p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/rada/barf" variant="action" size="md" className="shadow-float">
                Nakupovat <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden />
              </ButtonLink>
              <ButtonLink href="#krmeni-na-miru" variant="secondary" size="md" className="ring-line hover:ring-green">
                Spočítat dávku
              </ButtonLink>
            </div>
          </div>

          <div className="grid w-full flex-1 grid-cols-2 grid-rows-[150px] gap-3.5 md:grid-rows-[280px_150px] lg:ml-auto lg:max-w-[600px]">
            {/* Ilustrace psů u misky DoKosti, průhledné pozadí: stojí přímo na krémové, přes oba sloupce. Na telefonu skrytá, zabírala by moc místa. */}
            <div className="relative col-span-2 hidden md:block">
              <Image src="/foto/psi-u-misky-ilustrace-v2.webp" alt="Dva psi u misky DoKosti BARF" fill priority sizes="(min-width: 62rem) 600px, 50vw" className="object-contain" />
            </div>
            <PromoTile daily={dailyCost} sales={sales} />
            <Link href="/krmeni-na-miru" className="group flex flex-col justify-end rounded-panel bg-green p-5 text-cream transition-colors duration-300 hover:bg-green-hover">
              <span className="font-display text-[1.5rem] leading-tight font-bold text-white">Krmení na míru</span>
              <span className="mt-1 inline-flex items-center gap-1.5 text-small text-cream/80">
                Dávka pro vašeho psa <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={1.75} aria-hidden />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Kategorie: velké dlaždice, jen název. */}
      <section className="px-5 pb-14">
        <ul className="mx-auto grid max-w-site grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {LINES.map((slug, i) => {
            const line = LINE_INFO[slug];
            const photo = lineImage(slug);
            const Icon = LINE_ICON[slug];
            return (
              <li key={slug}>
                <Link href={`/rada/${slug}`} className="group flex flex-col gap-2.5">
                  <span className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-panel ${photo?.image ? "border border-line bg-white" : TILE_TONE[i % TILE_TONE.length]} transition-shadow duration-300 group-hover:shadow-card-hover`}>
                    {photo?.image ? (
                      <Image src={photo.image} alt="" fill sizes="(min-width: 62rem) 190px, 45vw" className="object-contain p-5" />
                    ) : (
                      <Icon className="size-14 text-green" strokeWidth={1.5} aria-hidden />
                    )}
                  </span>
                  <span className="text-center font-display text-[1.125rem] font-bold text-ink group-hover:text-brick-text">{line.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="oblibene" className="border-y border-line bg-white px-5 py-14">
        <div className="mx-auto max-w-site">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-display-md text-ink md:text-[2rem]">Nejoblíbenější</h2>
            <LinkArrow href="/rada/barf">Celá nabídka</LinkArrow>
          </div>
          <ProductGrid products={featured} columns={4} />
        </div>
      </section>

      {/* Jediná zelená sekce na stránce. */}
      <section id="krmeni-na-miru" className="bg-cream px-5 py-14">
        <div className="mx-auto flex max-w-site flex-col overflow-hidden rounded-[28px] bg-green text-cream md:flex-row">
          <div className="relative min-h-64 bg-green-hover md:w-5/12">
            <Image src={STOCK_PHOTOS.goldenRetriever.src} alt={STOCK_PHOTOS.goldenRetriever.alt} fill sizes="(min-width: 48rem) 500px, 100vw" className="object-cover" />
          </div>
          <div className="flex flex-1 flex-col gap-5 p-8 md:p-10">
            <div>
              <p className="text-eyebrow text-ochre uppercase">Krmení na míru</p>
              <h2 className="mt-1.5 font-display text-display-md text-white md:text-[2rem]">Kolik váží váš pes?</h2>
            </div>
            <DoseTeaser />
          </div>
        </div>
      </section>

      <section id="prodejna" className="px-5 py-14">
        <div className="mx-auto grid max-w-site gap-4 md:grid-cols-3">
          <div className="flex min-h-64 items-center justify-center rounded-panel bg-stone md:col-span-2">
            <Logo variant="znak" width={180} className="w-1/3 max-w-[180px]" />
          </div>
          <div className="flex flex-col gap-3.5 rounded-panel border border-line bg-white p-7">
            <h2 className="font-display text-[1.75rem] text-ink">Prodejna {shop.city}</h2>
            <div className="flex items-start gap-2 text-body">
              <MapPin className="mt-1 size-4 shrink-0 text-brick" strokeWidth={1.75} aria-hidden />
              <span>{address ? `${address}, ${shop.city}` : `${shop.city}, adresu brzy doplníme`}</span>
            </div>
            {hours.length > 0 && (
              <ul className="text-body">
                {hours.map((h) => (
                  <li key={h.days}>
                    <strong>{h.days}</strong> {h.hours}
                  </li>
                ))}
              </ul>
            )}
            {phone && (
              <a href={`tel:${phone.replace(/\s+/g, "")}`} className="font-semibold text-green">
                {phone}
              </a>
            )}
            <ButtonLink href="/kontakt" size="sm" className="mt-auto self-start">
              Jak k nám
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
