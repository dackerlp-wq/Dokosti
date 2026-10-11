import type { Metadata } from "next";
import Link from "next/link";
import { BarfCalculator } from "@/components/barf/barf-calculator";
import { JsonLd } from "@/components/seo/json-ld";
import { SideCards, WizardHero, WizardLayout } from "@/components/plan/wizard-ui";
import { Section, SectionHeader } from "@/components/ui/section";
import { StepDisc } from "@/components/ui/field";
import { getProducts } from "@/lib/products";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Kalkulačka dávky BARF pro psy a kočky",
  description:
    "Spočítejte, kolik syrové stravy denně potřebuje váš pes nebo kočka. Podle hmotnosti, věku, aktivity a kondice, s doporučením z naší nabídky a nákupním seznamem.",
  alternates: { canonical: `${SITE_URL}/kalkulacka` },
};

const FAQ = [
  ["Proč vychází malému psovi víc procent než velkému?", "Potřeba energie roste s hmotností pomaleji než hmotnost sama. Čivava proto potřebuje 4–5 % své váhy, doga necelá 2 %. Tabulka „2–3 %“ platí jen pro střední psy, kalkulačka počítá energii a procento jen ukazuje pro kontrolu."],
  ["Jak přesný je výsledek?", "Je to výchozí hodnota pro zdravé zvíře podle doporučení FEDIAF. Skutečná potřeba se liší i o 20 %. Po dvou až čtyřech týdnech zvíře zvažte a dávku upravte podle kondice."],
  ["Co když neznám dospělou hmotnost štěněte?", "Vyberte plemeno, zadejte průměr hmotnosti rodičů, nebo pole nechte prázdné. Kalkulačka ji odhadne z aktuální hmotnosti a věku podle růstové křivky, do 12 týdnů je ale odhad hrubý."],
  ["Proč kalkulačka doporučuje Kosti jako náhradu mixu, ne navíc?", "BARF mixy už kost obsahují. Kdyby se Kosti jen přidaly, kosti v dávce by bylo příliš a stolice tvrdá. Proto se s nimi nahrazuje část mixu, a když je podíl kosti v mixu známý z etikety, kalkulačka ho dopočítá přesně."],
  ["Můžu granule a syrovou stravu kombinovat?", "Ano. U štěňat a při přechodu nabízí kalkulačka podíl syrové stravy, energie se rozdělí a granule se dopočítají podle údajů z obalu. Nejlépe je podávat je v oddělených jídlech."],
  ["Co kalkulačka nespočítá?", "Dávku pro nemocná zvířata, hubnutí při výrazné nadváze a přesné složení pro štěňata obřích plemen. To patří k veterináři, kalkulačka vám dá jen výchozí bod."],
] as const;

export default async function CalculatorPage() {
  const products = await getProducts();
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };

  return (
    <>
      <JsonLd data={faqLd} />
      <WizardHero eyebrow="Kalkulačka dávky" title="Kolik toho denně do misky?" em="Spočítáme to za vás." lead="Tři údaje a hned víte, kolik syrové stravy denně dávat a co si na čtrnáct dní koupit. Umí štěňata, koťata, seniory i březí a kojící zvířata." />
      <WizardLayout
        side={
          <SideCards
            items={[
              { icon: "calculator", title: "Tři údaje", text: "Kdo bude jíst, kolik váží a jak je starý. Ostatní má rozumné výchozí hodnoty.", tone: "paper" },
              { icon: "basket", title: "Nákup v celých baleních", text: "Seznam na 7, 14 nebo 30 dní z naší nabídky, jedním tlačítkem do košíku.", tone: "cream" },
              { icon: "paw", title: "Chcete víc?", text: "Průvodce Krmení na míru sestaví plán na jméno a nastaví pravidelné dodávky.", tone: "white" },
            ]}
            trust={
              <>
                <strong>Výpočet podle FEDIAF.</strong> Energie z metabolické hmotnosti, ne jedna tabulka procent.
              </>
            }
          />
        }
      >
        <BarfCalculator products={products} />
      </WizardLayout>

      <Section>
        <SectionHeader eyebrow="Postup" title="Jak počítáme">
          <p>Nepoužíváme jednu tabulku procent. Výpočet vychází z výživových doporučení FEDIAF a NRC, podle kterých se řídí i výrobci krmiv.</p>
        </SectionHeader>
        <ol className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Step n={1} title="Energie podle hmotnosti">
            Potřeba energie se počítá z metabolické hmotnosti (kg<sup>0,75</sup> u psa, kg<sup>0,67</sup> u kočky). Malí psi tak dostanou relativně víc, obří plemena méně.
          </Step>
          <Step n={2} title="Aktivita, kastrace, věk">
            Klidný pes potřebuje o čtvrtinu méně než sportovní. Kastrace snižuje potřebu zhruba o 15 %, u seniorů ubíráme energii, ne maso.
          </Step>
          <Step n={3} title="Kondice místo váhy">
            Při nadváze počítáme z cílové hmotnosti, ne z aktuální. Proto se ptáme na postavu: žebra, pas, tuk.
          </Step>
          <Step n={4} title="Gramy z energie krmiva">
            Energii převedeme na gramy podle hodnoty z etikety mixu. Kde údaj chybí, počítáme s běžnou hustotou syrové stravy a výsledek označíme jako orientační.
          </Step>
        </ol>
        <div className="mx-auto mt-10 grid max-w-narrow gap-10 md:grid-cols-2">
          <div>
            <h3 className="mb-2.5 text-heading-lg text-green">Štěňata a koťata</h3>
            <p>
              U štěňat používáme růstovou rovnici FEDIAF, která pracuje s aktuální i očekávanou dospělou hmotností. Malá plemena potřebují v poměru k váze
              nejvíc, proto tabulka „2–3 % dospělé hmotnosti“ u jorkšíra selhává. Koťata se počítají procentem hmotnosti podle věku, od 10 % v prvních
              měsících po 4 % před rokem. Štěně velkého plemene držte štíhlé a nikdy nepřidávejte vápník navíc.
            </p>
          </div>
          <div>
            <h3 className="mb-2.5 text-heading-lg text-green">Složení a bilance kosti</h3>
            <p>
              Cílem je zhruba 8 % jedlé kosti u dospělého psa, 6 % u kočky a 15 % u štěněte, 5 % jater a 5 % dalších vnitřností. Kost se nepočítá podle
              hmotnosti masitých kostí, ale podle toho, kolik kosti v nich je (kuřecí krk asi 36 %). BARF mixy kost už obsahují, Kosti proto nahrazují část
              mixu.
            </p>
          </div>
        </div>
        <p className="mx-auto mt-7.5 max-w-text text-center text-small">
          Kalkulačka je součástí průvodce{" "}
          <Link href="/jak-zacit-s-barfem" className="text-brick-text underline">
            Jak začít s BARFem
          </Link>
          , kde najdete i postup přechodu z granulí a zásady hygieny.
        </p>
      </Section>

      <Section tone="paper">
        <SectionHeader eyebrow="Otázky" title="Časté dotazy ke kalkulačce" />
        <div className="mx-auto max-w-text divide-y divide-line border-y border-line">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-3.5">
              <summary className="cursor-pointer list-none font-display text-display-sm text-green marker:content-none [&::-webkit-details-marker]:hidden">{q}</summary>
              <p className="mt-2.5">{a}</p>
            </details>
          ))}
        </div>
        <p className="mx-auto mt-7.5 max-w-text text-small">
          Kosti podávejte vždy syrové, nikdy vařené, pod dohledem a ve velikosti odpovídající zvířeti. Nikdy nekrmte syrovým masem divokých prasat. Se syrovým
          masem zacházejte jako s masem pro lidskou spotřebu: rozmrazujte v lednici, rozmražené spotřebujte do dvou dnů, misky myjte denně.
        </p>
      </Section>
    </>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-col items-center text-center">
      <StepDisc n={n} className="size-14 text-[20px]" />
      <h3 className="my-3.5 text-heading-md text-green">{title}</h3>
      <p className="px-2 text-small">{children}</p>
    </li>
  );
}
