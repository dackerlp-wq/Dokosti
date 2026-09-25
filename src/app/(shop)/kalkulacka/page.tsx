import type { Metadata } from "next";
import Link from "next/link";
import { BarfCalculator, type SavedPet } from "@/components/barf/barf-calculator";
import { JsonLd } from "@/components/seo/json-ld";
import { Section, SectionHeading } from "@/components/ui/section";
import { getCustomerUser } from "@/lib/customer";
import { decodePlanRequest } from "@/lib/pdf/request";
import { getProducts } from "@/lib/products";
import { SITE_URL } from "@/lib/seo";
import { getAuthSupabase } from "@/lib/supabase/auth";

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
  ["Proč kalkulačka doporučuje Kosti jako náhradu mixu, ne navíc?", "Mixy Základ už kost obsahují. Kdyby se Kosti jen přidaly, kosti v dávce by bylo příliš a stolice tvrdá. Proto se s nimi nahrazuje část mixu, a když je podíl kosti v mixu známý z etikety, kalkulačka ho dopočítá přesně."],
  ["Můžu granule a syrovou stravu kombinovat?", "Ano. U štěňat a při přechodu nabízí kalkulačka podíl syrové stravy, energie se rozdělí a granule se dopočítají podle údajů z obalu. Nejlépe je podávat je v oddělených jídlech."],
  ["Co kalkulačka nespočítá?", "Dávku pro nemocná zvířata, hubnutí při výrazné nadváze a přesné složení pro štěňata obřích plemen. To patří k veterináři, kalkulačka vám dá jen výchozí bod."],
] as const;

export default async function CalculatorPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const [products, user, { d }] = await Promise.all([getProducts(), getCustomerUser(), searchParams]);
  const initial = decodePlanRequest(d ?? null);
  let savedPets: SavedPet[] = [];
  if (user) {
    const db = await getAuthSupabase();
    const { data } = await db.from("pets").select("id, name, data").order("updated_at", { ascending: false }).limit(10);
    savedPets = (data ?? []) as SavedPet[];
  }
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };

  return (
    <>
      <JsonLd data={faqLd} />
      <div className="container-dk pt-6 md:pt-10">
        <p className="label mb-2 text-brick-text">Kalkulačka dávky</p>
        <h1 className="max-w-3xl">Kolik syrové stravy denně? Spočítáme to za vás.</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Zadejte hmotnost, věk, aktivitu a kondici. Kalkulačka spočítá denní dávku, rozdělí ji na maso, kost a vnitřnosti, doporučí
          produkty z naší aktuální nabídky a sečte nákup na týden, čtrnáct dní nebo měsíc. Umí štěňata, koťata, seniory, březí a
          kojící zvířata i více zvířat najednou.
        </p>
      </div>

      <Section tone="cream">
        <BarfCalculator products={products} user={user} savedPets={savedPets} initial={initial} />
      </Section>

      <Section tone="paper">
        <SectionHeading title="Jak počítáme">
          Nepoužíváme jednu tabulku procent. Výpočet vychází z výživových doporučení FEDIAF a NRC, podle kterých se řídí i výrobci
          krmiv.
        </SectionHeading>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Card title="1. Energie podle hmotnosti">
            Potřeba energie se počítá z metabolické hmotnosti (kg<sup>0,75</sup> u psa, kg<sup>0,67</sup> u kočky). Malí psi tak dostanou
            relativně víc, obří plemena méně.
          </Card>
          <Card title="2. Aktivita, kastrace, věk">
            Klidný pes potřebuje o čtvrtinu méně než sportovní. Kastrace snižuje potřebu zhruba o 15 %, u seniorů ubíráme energii, ne maso.
          </Card>
          <Card title="3. Kondice místo váhy">
            Při nadváze počítáme z cílové hmotnosti, ne z aktuální. Proto se ptáme na postavu: žebra, pas, tuk.
          </Card>
          <Card title="4. Gramy z energie krmiva">
            Energii převedeme na gramy podle hodnoty z etikety mixu. Kde údaj chybí, počítáme s běžnou hustotou syrové stravy a výsledek
            označíme jako orientační.
          </Card>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <h3>Štěňata a koťata</h3>
            <p className="mt-1 text-sm text-muted">
              U štěňat používáme růstovou rovnici FEDIAF, která pracuje s aktuální i očekávanou dospělou hmotností. Malá plemena potřebují
              v poměru k váze nejvíc, proto tabulka „2–3 % dospělé hmotnosti“ u jorkšíra selhává. Koťata se počítají procentem hmotnosti
              podle věku, od 10 % v prvních měsících po 4 % před rokem. Štěně velkého plemene držte štíhlé a nikdy nepřidávejte vápník
              navíc.
            </p>
          </div>
          <div>
            <h3>Složení a bilance kosti</h3>
            <p className="mt-1 text-sm text-muted">
              Cílem je zhruba 8 % jedlé kosti u dospělého psa, 6 % u kočky a 15 % u štěněte, 5 % jater a 5 % dalších vnitřností. Kost se
              nepočítá podle hmotnosti masitých kostí, ale podle toho, kolik kosti v nich je (kuřecí krk asi 36 %). Mixy Základ kost už
              obsahují, Kosti proto nahrazují část mixu.
            </p>
          </div>
        </div>
        <p className="mt-5 text-sm text-muted">
          Kalkulačka je součástí průvodce{" "}
          <Link href="/jak-zacit-s-barfem" className="text-green underline">
            Jak začít s BARFem
          </Link>
          , kde najdete i postup přechodu z granulí a zásady hygieny.
        </p>
      </Section>

      <Section tone="cream">
        <SectionHeading title="Časté dotazy ke kalkulačce" />
        <div className="grid gap-3 md:grid-cols-2">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-[var(--radius-card)] border border-line bg-paper p-4">
              <summary className="cursor-pointer font-display text-[17px] font-semibold marker:text-brick-text">{q}</summary>
              <p className="mt-2 text-sm text-muted">{a}</p>
            </details>
          ))}
        </div>
        <p className="mt-5 max-w-2xl text-xs text-muted">
          Kosti podávejte vždy syrové, nikdy vařené, pod dohledem a ve velikosti odpovídající zvířeti. Nikdy nekrmte syrovým masem divokých
          prasat. Se syrovým masem zacházejte jako s masem pro lidskou spotřebu: rozmrazujte v lednici, rozmražené spotřebujte do dvou dnů,
          misky myjte denně.
        </p>
      </Section>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-cream p-4">
      <h3 className="text-[17px]">{title}</h3>
      <p className="mt-1 text-sm text-muted">{children}</p>
    </div>
  );
}
