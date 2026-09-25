import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/section";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Jak začít s BARFem",
  description: "Jednoduchý návod pro začátečníky: kolik masa dávat, jak přejít z granulí, jak rozmrazovat a skladovat.",
};

export default async function HowToStartPage() {
  const { shop } = await getSettings();
  return (
    <>
      <div className="container-dk pt-6 md:pt-10">
        <p className="label mb-2 text-brick-text">Pro začátečníky</p>
        <h1>Jak začít s BARFem</h1>
        <p className="mt-2 max-w-2xl text-muted">
          BARF je krmení syrovým masem, kostmi a vnitřnostmi tak, jak to psi a kočky jedli odjakživa. Není to věda, ale
          pár věcí je dobré vědět dopředu. Tady je to nejdůležitější, bez hantýrky.
        </p>
      </div>

      <Section tone="cream">
        <SectionHeading eyebrow="1" title="Kolik masa dávat" />
        <div className="grid gap-4 md:grid-cols-3">
          <Card title="Dospělý pes">2–3 % hmotnosti denně. Dvacetikilový pes tedy 400–600 g. Klidný gaučák spíš míň, sportovec víc.</Card>
          <Card title="Štěně">5–8 % hmotnosti, rozdělené do 3–4 porcí denně. Jak roste, procenta klesají k dospělé dávce.</Card>
          <Card title="Kočka">Zhruba 3 % hmotnosti denně, ve dvou až třech porcích. Kočky jsou vybíravé, přechod dělejte pomalu.</Card>
        </div>
        <p className="mt-4 max-w-2xl text-sm text-muted">
          Na detailu každého produktu je kalkulačka, která to spočítá za vás. Za dva týdny zvíře zvažte a dávku podle
          toho upravte. Nevíte si rady? Stavte se, spočítáme to spolu.
        </p>
      </Section>

      <Section tone="paper">
        <SectionHeading eyebrow="2" title="Co má být v misce" />
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Základ = hotový mix">
            Naše řada Základ jsou mixy, kde už je maso, masité kosti a vnitřnosti v poměru pro každodenní krmení. Pro
            začátek nic dalšího nepotřebujete: rozmrazíte, odvážíte, podáte.
          </Card>
          <Card title="Časem přidejte">
            Rybí olej pro srst a klouby, trochu zeleniny pro vlákninu, občas masitou kost na hryzání a čištění zubů. Řady
            Navíc a Kosti. Pamlsky (Mlsky) počítejte do denní dávky.
          </Card>
        </div>
      </Section>

      <Section tone="cream">
        <SectionHeading eyebrow="3" title="Jak přejít z granulí" />
        <ol className="max-w-2xl list-decimal space-y-3 pl-5 text-muted">
          <li>
            <strong className="text-ink">Rychlý přechod (většina psů):</strong> jeden den vynechejte večerní granule, ráno
            dejte poloviční dávku syrového, další den plnou. Jednoduché mixy (kuřecí, krůtí) jsou pro začátek nejlepší.
          </li>
          <li>
            <strong className="text-ink">Pomalý přechod (citlivější zažívání, senioři, kočky):</strong> týden až dva
            postupně zvyšujte podíl syrového a snižujte granule. Syrové a granule ale nedávejte v jedné misce najednou.
          </li>
          <li>
            <strong className="text-ink">První dny:</strong> řidší stolice nebo menší chuť k jídlu jsou běžné, do týdne se
            to srovná. Kdyby potíže trvaly déle nebo bylo zvíře malátné, zavolejte veterináři.
          </li>
        </ol>
      </Section>

      <Section tone="paper">
        <SectionHeading eyebrow="4" title="Rozmrazování a skladování" />
        <div className="grid gap-4 md:grid-cols-3">
          <Card title="Mrazák">Doma hned do mrazáku, −18 °C. Naše balení vydrží podle data na etiketě, běžně měsíce.</Card>
          <Card title="Rozmrazování">Večer přendejte zítřejší dávku do lednice. Ne na lince, ne v mikrovlnce, ne v teplé vodě.</Card>
          <Card title="Rozmražené">V lednici spotřebujte do 48 hodin (ryby do 24). Znovu nezamrazujte. Misku po jídle umyjte.</Card>
        </div>
      </Section>

      <Section tone="cream">
        <SectionHeading eyebrow="5" title="Na co si dát pozor" />
        <ul className="max-w-2xl list-disc space-y-2 pl-5 text-muted">
          <li>Kosti jen syrové. Vařené a pečené kosti se štípou.</li>
          <li>Kosti podávejte pod dohledem a v odpovídající velikosti. Malý pes a kuřecí krk ano, malý pes a hovězí kloub ne.</li>
          <li>Hygiena jako u masa pro lidi: čisté ruce, prkénko, miska. Syrové maso není pro děti na hraní.</li>
          <li>BARF není pro každého. Zvířata s některými nemocemi potřebují jinou stravu. Poraďte se s veterinářem, my rádi doplníme praxi z prodejny.</li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/rada/zaklad">Vybrat první mix</ButtonLink>
          <ButtonLink href="/kontakt" variant="secondary">
            Zeptat se v prodejně
          </ButtonLink>
        </div>
        <p className="mt-4 text-sm text-muted">
          {shop.name}, {shop.address}, {shop.city}. Vezměte psa, poradíme naživo.
        </p>
      </Section>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
      <h3>{title}</h3>
      <p className="mt-1 text-sm text-muted">{children}</p>
    </div>
  );
}
