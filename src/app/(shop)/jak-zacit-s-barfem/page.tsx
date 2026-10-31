import type { Metadata } from "next";
import { Bone, Eye, Heart, Smile, Sparkles, Utensils } from "lucide-react";
import Link from "next/link";
import { InquiryForm } from "@/components/barf/inquiry-form";
import { ProductGrid } from "@/components/product/product-grid";
import { IconTile } from "@/components/ui/icon-tile";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/ui/button";
import { StepDisc } from "@/components/ui/field";
import { PageIntro } from "@/components/ui/page-intro";
import { Section, SectionHeader } from "@/components/ui/section";
import { getProducts } from "@/lib/products";
import { SITE_URL } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Jak začít s BARFem: průvodce pro psy i kočky",
  description:
    "Co je BARF, kolik krmit, jak poskládat jídelníček a jak přejít z granulí. Srozumitelný průvodce pro začátečníky, kalkulačka dávky a startovací balíčky.",
  alternates: { canonical: `${SITE_URL}/jak-zacit-s-barfem` },
};

const FAQ = [
  ["Je BARF vhodný pro každého psa a kočku?", "Pro většinu zdravých zvířat ano. U zvířat s onemocněním ledvin, slinivky nebo s oslabenou imunitou se nejdřív poraďte s veterinářem."],
  ["Můžu kombinovat BARF s granulemi?", "Můžete. Nejpřehlednější je dávat například ráno granule a večer syrovou stravu a sečíst energii obou, což za vás udělá kalkulačka. Přechod dělejte postupně."],
  ["Není to drahé?", "Záleží na druhu masa a velikosti zvířete. U středně velkého psa vychází BARF cenově podobně jako kvalitní granule. Kalkulačka výše vám spočítá, kolik krmiva týdně potřebujete."],
  ["Kolikrát denně krmit?", "Dospělého psa jednou až dvakrát denně, kočku dvakrát až třikrát. Štěňata a koťata krmte častěji v menších porcích."],
  ["Jak maso skladovat?", "V mrazáku při −18 °C. Menší porce rozmrazujte v lednici den předem. Maso od nás přichází zamražené v praktických baleních."],
  ["Pes má po přechodu průjem. Co teď?", "Vraťte se o krok zpět a přidejte trochu víc kostí, stolici zpevňují. Pokud průjem trvá déle než dva dny nebo je doprovázený zvracením či apatií, navštivte veterináře."],
  ["Nebojím se salmonely?", "Trávicí trakt psů a koček je na syrové maso přizpůsobený lépe než ten náš. Riziko se týká hlavně lidí v domácnosti, proto dodržujte zásady hygieny popsané výše."],
  ["Jak poznám, že BARF funguje?", "Během několika týdnů si obvykle všimnete menší a pevnější stolice, lesklejší srsti a stabilní hmotnosti. Chcete-li mít jistotu, nechte po pár měsících udělat krevní rozbor."],
] as const;

export default async function HowToStartPage() {
  const [products, { shop }] = await Promise.all([getProducts(), getSettings()]);
  // Startovací balíčky: produkty se slugem začínajícím „startovaci-“, dokud nejsou, ukáže se obecný text.
  const packs = products.filter((p) => p.slug.startsWith("startovaci-"));
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };

  return (
    <>
      <JsonLd data={faqLd} />

      {/* 1. Úvod */}
      <PageIntro
        eyebrow="Jak začít s BARFem"
        title="Začít je jednodušší, než se zdá."
        actions={
          <>
            <ButtonLink href="/krmeni-na-miru" variant="action" size="md">
              Spočítat dávku
            </ButtonLink>
            <ButtonLink href="#balicky" variant="secondary" size="md">
              Vybrat startovací balíček
            </ButtonLink>
          </>
        }
      >
        <p>
          Uvažujete o syrové stravě pro psa nebo kočku, ale nevíte, kde začít? Tento průvodce vás provede od prvního nákupu až po plnohodnotný
          jídelníček. Dozvíte se, co do misky patří, kolik toho dávat a jak zvládnout přechod z granulí nebo konzerv bez stresu.
        </p>
      </PageIntro>

      {/* 2. Co je BARF */}
      <Section tone="paper">
        <SectionHeader eyebrow="Základ" title="Co je BARF" />
        <div className="mx-auto max-w-text space-y-3.5">
          <p>
            BARF je zkratka z anglického <em>Biologically Appropriate Raw Food</em>, tedy biologicky vhodná syrová strava. Krmíte tím, co by pes nebo kočka
            jedli v přírodě: syrovým masem, masitými kostmi a vnitřnostmi. Psům k tomu přidáte i trochu zeleniny a ovoce.
          </p>
          <p>
            Nemusíte být odborník ani trávit hodiny v kuchyni. Stačí dodržet pár základních pravidel a mít po ruce kvalitní suroviny. Ty u nás v DoKosti
            najdete na jednom místě: BARF mixy, kosti, doplňky i pamlsky.
          </p>
        </div>
      </Section>

      {/* 3. Proč BARF */}
      <Section>
        <SectionHeader eyebrow="Zkušenost majitelů" title="Proč BARF">
          <p>Majitelé, kteří na syrovou stravu přešli, nejčastěji zmiňují tyto změny:</p>
        </SectionHeader>
        <div className="grid gap-x-5 gap-y-7.5 xs:grid-cols-2 lg:grid-cols-3">
          <IconTile icon={Eye} title="Víte, co je v misce" text="Žádná dlouhá složení, jen maso, kosti a vnitřnosti." />
          <IconTile icon={Sparkles} title="Lesklejší srst" text="Přirozené tuky a živiny se projeví i na vzhledu." />
          <IconTile icon={Bone} title="Čistší zuby" text="Okusování masitých kostí pomáhá předcházet zubnímu kameni." />
          <IconTile icon={Heart} title="Menší stolice" text="Tělo zužitkuje větší část potravy, stolice je menší a méně cítit." />
          <IconTile icon={Smile} title="Radost z jídla" text="Většina psů i koček se na misku vyloženě těší." />
          <IconTile icon={Utensils} title="Snadné přizpůsobení" text="Když zvířeti některé maso nesedí, jednoduše ho vyřadíte." />
        </div>
        <p className="mx-auto mt-7.5 max-w-text text-center text-small">
          Každé zvíře je jiné. Pokud má zdravotní potíže, je březí nebo jde o štěně či kotě, poraďte se před změnou stravy s veterinářem.
        </p>
      </Section>

      {/* 4. Co patří do misky */}
      <Section tone="paper">
        <SectionHeader eyebrow="Složení" title="Co patří do misky">
          <p>Dobrý BARF jídelníček stojí na správném poměru surovin. Nemusí sedět každý den na gram. Důležité je, aby vyvážený byl v průběhu týdne až dvou.</p>
        </SectionHeader>
        <div className="mx-auto grid max-w-narrow gap-10 md:grid-cols-2">
          <div>
            <h3 className="text-heading-lg text-green">Pes</h3>
            <p className="mt-2.5">Zhruba 80 % živočišné složky a 20 % rostlinné. Živočišnou část rozdělte takto:</p>
            <RatioTable
              rows={[
                ["Svalovina", "50 %", "hovězí, krůtí, kuřecí, jehněčí maso, srdce"],
                ["Zelené bachory", "20 %", "hovězí nebo jehněčí bachor"],
                ["Vnitřnosti", "15 %", "játra (asi třetina), ledviny, slezina, plíce"],
                ["Masité kosti", "15 %", "kuřecí krky, křídla, skelety, krůtí krky"],
              ]}
            />
            <p className="mt-3.5 text-small">
              Rostlinná část: rozmixovaná nebo spařená zelenina a trocha ovoce, například mrkev, cuketa, dýně, špenát, jablko. Nevhodné jsou cibule, česnek
              ve velkém množství, hrozny, rozinky a avokádo.
            </p>
          </div>
          <div>
            <h3 className="text-heading-lg text-green">Kočka</h3>
            <p className="mt-2.5">Kočka je striktní masožravec, rostlinnou složku nepotřebuje. Orientační poměr:</p>
            <RatioTable
              rows={[
                ["Svalovina (vč. srdcí)", "80 %", "kuřecí, krůtí, králičí maso, kuřecí srdce"],
                ["Masité kosti", "10 %", "kuřecí krky, křidélka, mleté kosti"],
                ["Vnitřnosti", "10 %", "játra (polovina), ledviny, slezina"],
              ]}
            />
            <p className="mt-3.5 text-small">
              Kočky potřebují dostatek taurinu. Najdete ho hlavně v srdcích a tmavém mase, proto by v jídelníčku neměly chybět. Při mražení část taurinu
              ubývá, a tak se často doplňuje i v podobě doplňku stravy.
            </p>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-text rounded-card border border-line bg-white p-5 shadow-card">
          <h3 className="text-heading-md text-green">Doplňky</h3>
          <p className="mt-2.5">
            Základ tvoří kvalitní olej s omega-3 mastnými kyselinami (lososový, z tresčích jater nebo z řas). Podle potřeby můžete přidat mořské řasy, vitamín
            E nebo pivovarské kvasnice. Na začátek stačí jeden olej, další doplňky řešte až s plným jídelníčkem.{" "}
            <Link href="/rada/navic" className="text-brick-text underline">
              Doplňky v e-shopu
            </Link>
          </p>
        </div>
      </Section>

      {/* 5. Kolik krmit + kalkulačka */}
      <Section id="kalkulacka" className="scroll-mt-4">
        <SectionHeader eyebrow="Dávka" title="Kolik krmit">
          <p>Denní dávka se počítá z hmotnosti zvířete. Jde o výchozí bod, podle kterého pak dávku upravujete.</p>
        </SectionHeader>
        <div className="mb-10 grid gap-5 xs:grid-cols-2 xl:grid-cols-4">
          <Card title="Dospělý pes">Střední pes 2–3 % tělesné hmotnosti denně, malí psi 3–5 %, obří plemena kolem 2 %. Klidní a kastrovaní psi méně, sportovní víc.</Card>
          <Card title="Štěně">6–10 % aktuální hmotnosti v prvních měsících, s věkem postupně ubírejte. Přesněji podle věku a dospělé hmotnosti spočítá plán v Krmení na míru.</Card>
          <Card title="Dospělá kočka">2–4 % tělesné hmotnosti denně, bytová kastrovaná kočka spíš 2–3 %.</Card>
          <Card title="Kotě">10 % aktuální hmotnosti v prvních měsících, před rokem 4 %, rozděleno do více menších porcí.</Card>
        </div>
        <p className="mx-auto mb-10 max-w-text text-center">
          Nejlepším ukazatelem je postava. Žebra byste měli nahmatat, ale ne vidět. Když zvíře přibírá, dávku o kousek snižte, když hubne, přidejte.
        </p>
        <div className="flex flex-wrap justify-center gap-5">
          <ButtonLink href="/krmeni-na-miru" size="md">
            Sestavit plán
          </ButtonLink>
          <ButtonLink href="/#krmeni-na-miru" variant="secondary" size="md">
            Orientační dávka
          </ButtonLink>
        </div>
      </Section>

      {/* 6. Přechod krok za krokem */}
      <Section tone="paper">
        <SectionHeader eyebrow="Přechod" title="Krok za krokem">
          <p>
            Trávení si na novou stravu zvyká postupně. Proto začněte jednoduše a nové suroviny přidávejte jednu po druhé. Když se objeví měkčí stolice,
            zůstaňte u posledního kroku o pár dní déle.
          </p>
        </SectionHeader>
        <ol className="mx-auto grid max-w-narrow gap-7.5">
          <Step n={1} title="Jeden druh masa" when="1. týden">
            Začněte lehce stravitelnou drůbeží, typicky krůtím nebo kuřecím masem. Podávejte jen svalovinu, u psů případně s troškou zeleniny. Pokud zatím
            krmíte i granulemi, podávejte je v jiném jídle a celkovou dávku úměrně snižte.
          </Step>
          <Step n={2} title="Přidejte kosti" when="2. týden">
            Přidejte měkké masité kosti, například kuřecí krky. Kosti zpevňují stolici. Když je příliš tvrdá nebo světlá, kostí je moc.
          </Step>
          <Step n={3} title="Vnitřnosti a bachory" when="3. týden">
            Vnitřnosti přidávejte po malých kouscích, játra jsou silná a ve větším množství mohou způsobit průjem. U psů teď zařaďte i zelené bachory.
          </Step>
          <Step n={4} title="Další druhy masa" when="od 4. týdne">
            Postupně zkoušejte hovězí, jehněčí, králičí nebo rybu. Každý nový druh zkoušejte samostatně pár dní, ať snadno poznáte, co zvířeti nesedí.
          </Step>
          <Step n={5} title="Plný jídelníček a doplňky" when="dál">
            Až všechno funguje, přidejte olej a další doplňky a střídejte více druhů masa. Tím je přechod hotový.
          </Step>
        </ol>
        <div className="mx-auto mt-10 max-w-text rounded-card border border-line bg-white p-5 shadow-card">
          <p className="text-eyebrow text-muted uppercase">Tip pro kočky</p>
          <p className="mt-2.5">
            Kočky bývají ve změnách opatrné. Pokud syrové maso odmítá, zkuste ho nabídnout pokojové teploty, podávejte po lžičkách vedle obvyklého jídla nebo
            ho posypte oblíbeným sušeným pamlskem. Buďte trpěliví, u některých koček trvá přechod i několik týdnů. Kočka ale nesmí zůstat bez jídla déle než
            den.
          </p>
        </div>
      </Section>

      {/* 7. Hygiena a bezpečnost, 8. Časté chyby */}
      <Section>
        <div className="mx-auto grid max-w-narrow gap-10 md:grid-cols-2">
          <div>
            <h2 className="mb-3.5 font-display text-display-md text-green md:text-display-lg">Hygiena a bezpečnost</h2>
            <p className="mb-3.5">Se syrovým masem pracujte stejně jako při vaření pro sebe:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Rozmrazujte v lednici, ideálně přes noc. Ne na lince ani v teplé vodě.</li>
              <li>Rozmražené maso spotřebujte do 2–3 dnů a znovu ho nezmrazujte.</li>
              <li>Nesnědené zbytky po 20–30 minutách uklidte.</li>
              <li>Misky, nože a prkénka umyjte horkou vodou a mýdlem, ruce také.</li>
              <li>Nikdy nepodávejte vařené kosti. Tepelnou úpravou křehnou, tříští se a mohou poranit trávicí trakt.</li>
              <li>Kost volte podle velikosti zvířete. Musí být dost velká, aby ji nespolkl vcelku. Při žvýkání mějte zvíře na očích.</li>
              <li>Vepřové jen z kontrolovaného chovu (u nás vždy s uvedeným původem). Nikdy nekrmte syrovým masem divokých prasat kvůli Aujeszkyho chorobě, mražení virus nezničí.</li>
              <li>Rybu střídmě, nejlépe mořskou a předem zmraženou.</li>
            </ul>
          </div>
          <div>
            <h2 className="mb-3.5 font-display text-display-md text-green md:text-display-lg">Časté chyby začátečníků</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li><strong>Příliš mnoho novinek najednou.</strong> Když se objeví potíže, nevíte, co je způsobilo.</li>
              <li><strong>Jen svalovina.</strong> Bez kostí a vnitřností chybí vápník, vitamíny a minerály.</li>
              <li><strong>Moc jater.</strong> Játra jsou výživná, ale ve velkém množství zatěžují trávení.</li>
              <li><strong>Přehnaná přesnost.</strong> Vyváženost se počítá v průběhu týdne, ne v každé misce.</li>
              <li><strong>Stále stejné maso.</strong> Střídání druhů zajistí pestřejší spektrum živin.</li>
              <li><strong>Zapomenutý olej.</strong> Omega-3 mastné kyseliny v mase z chovu často chybí.</li>
              <li><strong>Kosti nevhodné velikosti</strong> nebo tvrdé nosné kosti velkých zvířat, o které si pes může odlomit zub.</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* 9. Startovací balíčky */}
      <Section tone="paper" id="balicky" className="scroll-mt-4">
        <SectionHeader eyebrow="První nákup" title="Startovací balíčky">
          <p>Nechcete skládat první nákup sami? Připravili jsme balíčky, které obsahují vše na první týdny přechodu ve správném poměru.</p>
        </SectionHeader>
        {packs.length > 0 ? (
          <ProductGrid products={packs} columns={4} />
        ) : (
          <div className="mx-auto grid max-w-narrow gap-5 md:grid-cols-2">
            <Card title="Startovací balíček pro psy">
              Drůbeží svalovina, masité kosti, vnitřnosti, zelené bachory a lososový olej. Porce jsou rozdělené podle kroků přechodu, takže víte, co kdy
              otevřít.
              <span className="mt-2.5 block text-small">Varianty: malý pes (do 10 kg) · střední pes (10–25 kg) · velký pes (nad 25 kg)</span>
            </Card>
            <Card title="Startovací balíček pro kočky">
              Jemně mletá drůbeží směs s kostí, kuřecí srdce, vnitřnosti a taurin. Menší porce, které rozmrazíte přesně podle potřeby. Součástí je sáček
              sušených pamlsků na lákání k nové misce.
            </Card>
          </div>
        )}
        <p className="mt-5 text-center text-small">Ke každému balíčku přikládáme tištěný přehled přechodu krok za krokem.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-5">
          {packs.length === 0 && (
            <ButtonLink href="/krmeni-na-miru" size="md">
              Sestavit plán
            </ButtonLink>
          )}
          <ButtonLink href="/rada/barf" variant="secondary" size="md">
            Nakoupit jednotlivě
          </ButtonLink>
        </div>
      </Section>

      {/* 10. Časté dotazy */}
      <Section>
        <SectionHeader eyebrow="Otázky" title="Časté dotazy" />
        <div className="mx-auto max-w-text divide-y divide-line border-y border-line">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-3.5">
              <summary className="cursor-pointer list-none font-display text-display-sm text-green [&::-webkit-details-marker]:hidden">{q}</summary>
              <p className="mt-2.5">{a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* 11. Poradna: jediná krémová sekce na stránce */}
      <Section tone="cream">
        <div className="mx-auto grid max-w-narrow gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <p className="text-eyebrow text-muted uppercase">Poradna</p>
            <h2 className="mb-3.5 font-display text-display-md text-green md:text-display-lg">Nevíte si rady? Zeptejte se nás.</h2>
            <p className="mb-3.5">
              BARFem sami krmíme a rádi vám pomůžeme sestavit jídelníček na míru, vybrat vhodné kosti nebo vyřešit potíže při přechodu. Napište nám, co vašeho
              psa nebo kočku trápí, a ozveme se vám zpravidla do jednoho pracovního dne.
            </p>
            <p className="text-small">
              Nebo volejte {shop.phone} v otevírací době ({shop.openingHours.map((h) => `${h.days} ${h.hours}`).join(", ")}) nebo pište na {shop.email}.
            </p>
            <p className="mt-3.5 text-small">Naše rady nenahrazují veterinární péči. Při zdravotních potížích vždy kontaktujte veterináře.</p>
          </div>
          <InquiryForm />
        </div>
      </Section>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-line bg-white p-5 shadow-card">
      <h3 className="text-heading-md text-green">{title}</h3>
      <p className="mt-2.5 text-small">{children}</p>
    </div>
  );
}

function RatioTable({ rows }: { rows: readonly (readonly [string, string, string])[] }) {
  return (
    <table className="mt-3.5 w-full text-small">
      <thead>
        <tr className="text-left text-eyebrow text-muted uppercase">
          <th className="py-1 font-semibold">Složka</th>
          <th className="py-1 font-semibold">Podíl</th>
          <th className="py-1 font-semibold">Příklady</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map(([a, b, c]) => (
          <tr key={a}>
            <td className="py-1.5 pr-2 font-semibold text-ink">{a}</td>
            <td className="py-1.5 pr-2 whitespace-nowrap text-green">{b}</td>
            <td className="py-1.5">{c}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Step({ n, title, when, children }: { n: number; title: string; when: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-5">
      <StepDisc n={n} className="size-12 text-[18px]" />
      <div>
        <p className="text-eyebrow text-muted uppercase">{when}</p>
        <h3 className="mb-1.25 text-heading-md text-green">{title}</h3>
        <p>{children}</p>
      </div>
    </li>
  );
}
