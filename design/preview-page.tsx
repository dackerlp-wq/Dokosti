// Ukázková stránka: zkopíruj do app/design-preview/page.tsx a uprav cesty importů.
// Slouží jen k rychlé kontrole, že tokeny a komponenty v projektu sedí; do produkce nepatří.
import { Calculator, Snowflake, Store, Truck } from "lucide-react";
import { AnnouncementBar } from "./components/announcement-bar";
import { Flag, StockStatus } from "./components/badge";
import { Button } from "./components/button";
import { IconTile } from "./components/icon-tile";
import { LinkArrow } from "./components/link-arrow";
import { ProductCard } from "./components/product-card";
import { QuantityStepper } from "./components/quantity-stepper";
import { Section, SectionHeader } from "./components/section";

const products = [
  { id: "1", href: "/produkt/barf-kruti-mix", title: "Krůtí mix", image: "/placeholder-pack.svg", pack: "1,3 kg", price: "149 Kč", stock: { state: "in" as const }, flags: ["new" as const] },
  { id: "2", href: "/produkt/barf-kureci-mix", title: "Kuřecí mix", image: "/placeholder-pack.svg", pack: "1,3 kg", price: "149 Kč", oldPrice: "165 Kč", stock: { state: "low" as const, left: 5 }, flags: ["sale" as const] },
  { id: "3", href: "/produkt/barf-kralici-mix", title: "Králičí mix", image: "/placeholder-pack.svg", pack: "1,3 kg", price: "239 Kč", stock: { state: "out" as const } },
];

export default function DesignPreview() {
  return (
    <main>
      <AnnouncementBar>
        Mražené posíláme na začátku týdne · <a href="/doprava">Jak doručujeme</a>
      </AnnouncementBar>

      <section className="mx-auto flex max-w-site flex-col items-center gap-7.5 px-5 py-10 text-center md:flex-row md:py-15 md:text-left">
        <div className="flex flex-1 justify-center">
          <div className="size-80 rounded-full bg-cream" role="img" aria-label="Místo pro vyříznutou fotku" />
        </div>
        <div className="max-w-[570px] flex-1">
          <p className="text-eyebrow text-muted uppercase">Syrové krmivo pro psy a kočky</p>
          <h1 className="mb-7.5 font-display text-display-lg text-green md:text-display-xl">Poctivé do kosti.</h1>
          <p className="mb-7.5">
            Hotové BARF mixy, masité kosti a doplňky od ověřených výrobců. <strong>Víme, co je v každém balíčku</strong>, a řekneme to na rovinu.
          </p>
          <div className="flex flex-wrap justify-center gap-5 md:justify-start">
            <Button href="/rada/barf">Vybrat krmivo</Button>
            <Button href="/doprava" variant="outline">
              Jak doručujeme
            </Button>
          </div>
        </div>
      </section>

      <Section tone="paper">
        <SectionHeader eyebrow="Skladem" title="Z mrazáku rovnou k vám" more={<LinkArrow href="/rada/barf">Vše z řady</LinkArrow>} />
        <div className="grid gap-5 xs:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} {...p} description="Hotový mix masa, kostí a vnitřností. Denní krmení." />
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader eyebrow="Doručení" title="Mražené dovezeme mražené" />
        <div className="grid gap-x-5 gap-y-7.5 xs:grid-cols-2 xl:grid-cols-4">
          <IconTile icon={Store} title="Osobní odběr" text="Objednáte, připravíme do mrazáku, vyzvednete v prodejně v Kladně." />
          <IconTile icon={Truck} title="Rozvoz po okolí" text="Kladno a okolí vozíme sami v chladicím boxu. Domluvíme den a hodinu." />
          <IconTile icon={Snowflake} title="Chlazený přepravce" text="Po celé ČR v polystyrenu se suchým ledem. Posíláme na začátku týdne." />
          <IconTile icon={Calculator} title="Krmení na míru" href="/krmeni-na-miru" action={<Button href="/krmeni-na-miru" size="sm">Sestavit plán</Button>} />
        </div>
      </Section>

      <Section tone="paper">
        <div className="flex flex-wrap items-center justify-center gap-5">
          <Flag kind="new" />
          <Flag kind="favourite" />
          <Flag kind="sale" />
          <StockStatus stock={{ state: "in" }} />
          <StockStatus stock={{ state: "low", left: 5 }} />
          <StockStatus stock={{ state: "out" }} />
        </div>
        <div className="mt-7.5 flex flex-wrap items-center justify-center gap-5">
          <QuantityStepper />
          <Button size="lg">Vložit do košíku</Button>
          <Button variant="dark">Sestavit plán</Button>
          <Button variant="outline" size="sm">
            Jen spočítat dávku
          </Button>
        </div>
      </Section>
    </main>
  );
}
