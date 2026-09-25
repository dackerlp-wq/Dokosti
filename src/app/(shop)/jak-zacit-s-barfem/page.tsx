import type { Metadata } from "next";
import Link from "next/link";
import { BarfCalculator } from "@/components/barf/barf-calculator";
import { InquiryForm } from "@/components/barf/inquiry-form";
import { ProductGrid } from "@/components/product/product-grid";
import { JsonLd } from "@/components/seo/json-ld";
import { ButtonLink } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/ui/section";
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
  ["Můžu kombinovat BARF s granulemi?", "Můžete, ale ne v jedné misce. Pokud chcete krmit obojím, dávejte například ráno granule a večer syrovou stravu."],
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
      <div className="container-dk pt-6 md:pt-10">
        <p className="label mb-2 text-brick-text">Jak začít s BARFem</p>
        <h1 className="max-w-3xl">Syrová strava pro psa i kočku. Začít je jednodušší, než se zdá.</h1>
        <p className="mt-3 max-w-2xl text-muted">
          Uvažujete o BARFu, ale nevíte, kde začít? Připravili jsme průvodce, který vás provede od prvního nákupu až po
          plnohodnotný jídelníček. Dozvíte se, co do misky patří, kolik toho dávat a jak zvládnout přechod z granulí nebo
          konzerv bez stresu.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href="#kalkulacka">Spočítat dávku</ButtonLink>
          <ButtonLink href="#balicky" variant="secondary">
            Vybrat startovací balíček
          </ButtonLink>
        </div>
      </div>

      {/* 2. Co je BARF */}
      <Section tone="cream">
        <SectionHeading title="Co je BARF" />
        <div className="max-w-2xl space-y-3 text-muted">
          <p>
            BARF je zkratka z anglického <em>Biologically Appropriate Raw Food</em>, tedy biologicky vhodná syrová strava. Krmíte
            tím, co by pes nebo kočka jedli v přírodě: syrovým masem, masitými kostmi a vnitřnostmi. Psům k tomu přidáte i trochu
            zeleniny a ovoce.
          </p>
          <p>
            Nemusíte být odborník ani trávit hodiny v kuchyni. Stačí dodržet pár základních pravidel a mít po ruce kvalitní
            suroviny. Ty u nás v DoKosti najdete na jednom místě: bárfové maso, čerstvé kosti, doplňky stravy i pamlsky.
          </p>
        </div>
      </Section>

      {/* 3. Proč BARF */}
      <Section tone="paper">
        <SectionHeading title="Proč BARF">Majitelé, kteří na syrovou stravu přešli, nejčastěji zmiňují tyto změny:</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card title="Víte, co je v misce">Žádná dlouhá složení, jen maso, kosti a vnitřnosti.</Card>
          <Card title="Lesklejší srst a zdravější kůže">Přirozené tuky a živiny se projeví i na vzhledu.</Card>
          <Card title="Čistší zuby">Okusování masitých kostí pomáhá předcházet zubnímu kameni.</Card>
          <Card title="Menší a méně cítit stolice">Tělo zužitkuje větší část potravy.</Card>
          <Card title="Radost z jídla">Většina psů i koček se na misku vyloženě těší.</Card>
          <Card title="Snadné přizpůsobení">Když zvířeti některé maso nesedí, jednoduše ho vyřadíte.</Card>
        </div>
        <p className="mt-4 max-w-2xl text-sm text-muted">
          Každé zvíře je jiné. Pokud má váš mazlíček zdravotní potíže, je březí nebo jde o štěně či kotě, poraďte se před změnou
          stravy s veterinářem.
        </p>
      </Section>

      {/* 4. Co patří do misky */}
      <Section tone="cream">
        <SectionHeading title="Co patří do misky">
          Dobrý BARF jídelníček stojí na správném poměru surovin. Nemusí sedět každý den na gram. Důležité je, aby vyvážený byl v
          průběhu týdne až dvou.
        </SectionHeading>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3>Pes</h3>
            <p className="mt-1 text-sm text-muted">Zhruba 80 % živočišné složky a 20 % rostlinné. Živočišnou část rozdělte takto:</p>
            <RatioTable
              rows={[
                ["Svalovina", "50 %", "hovězí, krůtí, kuřecí, jehněčí maso, srdce"],
                ["Zelené bachory", "20 %", "hovězí nebo jehněčí bachor"],
                ["Vnitřnosti", "15 %", "játra (asi třetina), ledviny, slezina, plíce"],
                ["Masité kosti", "15 %", "kuřecí krky, křídla, skelety, krůtí krky"],
              ]}
            />
            <p className="mt-2 text-sm text-muted">
              Rostlinná část: rozmixovaná nebo spařená zelenina a trocha ovoce, například mrkev, cuketa, dýně, špenát, jablko.
              Nevhodné jsou cibule, česnek ve velkém množství, hrozny, rozinky a avokádo.
            </p>
          </div>
          <div>
            <h3>Kočka</h3>
            <p className="mt-1 text-sm text-muted">Kočka je striktní masožravec, rostlinnou složku nepotřebuje. Orientační poměr:</p>
            <RatioTable
              rows={[
                ["Svalovina (vč. srdcí)", "80 %", "kuřecí, krůtí, králičí maso, kuřecí srdce"],
                ["Masité kosti", "10 %", "kuřecí krky, křidélka, mleté kosti"],
                ["Vnitřnosti", "10 %", "játra (polovina), ledviny, slezina"],
              ]}
            />
            <p className="mt-2 text-sm text-muted">
              Kočky potřebují dostatek taurinu. Najdete ho hlavně v srdcích a tmavém mase, proto by v jídelníčku neměly chybět.
              Při mražení část taurinu ubývá, a tak se často doplňuje i v podobě doplňku stravy.
            </p>
          </div>
        </div>
        <div className="mt-6 max-w-2xl rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <h3>Doplňky</h3>
          <p className="mt-1 text-sm text-muted">
            Základ tvoří kvalitní olej s omega-3 mastnými kyselinami (lososový, z tresčích jater nebo z řas). Podle potřeby
            můžete přidat mořské řasy, vitamín E nebo pivovarské kvasnice. Na začátek stačí jeden olej, další doplňky řešte až s
            plným jídelníčkem.{" "}
            <Link href="/rada/navic" className="text-green underline">
              Řada Navíc
            </Link>
          </p>
        </div>
      </Section>

      {/* 5. Kolik krmit + kalkulačka */}
      <Section tone="paper">
        <SectionHeading title="Kolik krmit">
          Denní dávka se počítá z hmotnosti zvířete. Jde o výchozí bod, podle kterého pak dávku upravujete.
        </SectionHeading>
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card title="Dospělý pes">2–3 % tělesné hmotnosti denně. Klidnější a starší psi spíš 2 %, sportovní a pracovní psi 3 % i víc.</Card>
          <Card title="Štěně">4–6 % aktuální hmotnosti, s věkem postupně ubírejte.</Card>
          <Card title="Dospělá kočka">3–4 % tělesné hmotnosti denně.</Card>
          <Card title="Kotě">5–8 % aktuální hmotnosti, rozděleno do více menších porcí.</Card>
        </div>
        <p className="mb-6 max-w-2xl text-sm text-muted">
          Nejlepším ukazatelem je postava. Žebra byste měli nahmatat, ale ne vidět. Když mazlíček přibírá, dávku o kousek snižte,
          když hubne, přidejte.
        </p>
        <BarfCalculator products={products} />
      </Section>

      {/* 6. Přechod krok za krokem */}
      <Section tone="cream">
        <SectionHeading title="Přechod krok za krokem">
          Trávení si na novou stravu zvyká postupně. Proto začněte jednoduše a nové suroviny přidávejte jednu po druhé. Když se
          objeví měkčí stolice, zůstaňte u posledního kroku o pár dní déle.
        </SectionHeading>
        <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Step n={1} title="Jeden druh masa" when="1. týden">
            Začněte lehce stravitelnou drůbeží, typicky krůtím nebo kuřecím masem. Podávejte jen svalovinu, u psů případně s
            troškou zeleniny. Granule a syrové maso nedávejte v jedné misce, tráví se jinou rychlostí.
          </Step>
          <Step n={2} title="Přidejte kosti" when="2. týden">
            Přidejte měkké masité kosti, například kuřecí krky. Kosti zpevňují stolici. Když je příliš tvrdá nebo světlá, kostí
            je moc.
          </Step>
          <Step n={3} title="Vnitřnosti a bachory" when="3. týden">
            Vnitřnosti přidávejte po malých kouscích, játra jsou silná a ve větším množství mohou způsobit průjem. U psů teď
            zařaďte i zelené bachory.
          </Step>
          <Step n={4} title="Další druhy masa" when="od 4. týdne">
            Postupně zkoušejte hovězí, jehněčí, králičí nebo rybu. Každý nový druh zkoušejte samostatně pár dní, ať snadno
            poznáte, co mazlíčkovi nesedí.
          </Step>
          <Step n={5} title="Plný jídelníček a doplňky" when="dál">
            Až všechno funguje, přidejte olej a další doplňky a střídejte více druhů masa. Tím je přechod hotový.
          </Step>
          <li className="rounded-[var(--radius-card)] border border-brick bg-paper p-4">
            <p className="label text-[11px] text-brick-text">Tip pro kočky</p>
            <p className="mt-1 text-sm text-muted">
              Kočky bývají ve změnách opatrné. Pokud syrové maso odmítá, zkuste ho nabídnout pokojové teploty, podávejte po
              lžičkách vedle obvyklého jídla nebo ho posypte oblíbeným sušeným pamlskem. Buďte trpěliví, u některých koček trvá
              přechod i několik týdnů. Kočka ale nesmí zůstat bez jídla déle než den.
            </p>
          </li>
        </ol>
      </Section>

      {/* 7. Hygiena a bezpečnost, 8. Časté chyby */}
      <Section tone="paper">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <SectionHeading title="Hygiena a bezpečnost">Se syrovým masem pracujte stejně jako při vaření pro sebe:</SectionHeading>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
              <li>Rozmrazujte v lednici, ideálně přes noc. Ne na lince ani v teplé vodě.</li>
              <li>Rozmražené maso spotřebujte do 2–3 dnů a znovu ho nezmrazujte.</li>
              <li>Nesnědené zbytky po 20–30 minutách uklidte.</li>
              <li>Misky, nože a prkénka umyjte horkou vodou a mýdlem, ruce také.</li>
              <li>Nikdy nepodávejte vařené kosti. Tepelnou úpravou křehnou, tříští se a mohou poranit trávicí trakt.</li>
              <li>Kost volte podle velikosti zvířete. Musí být dost velká, aby ji nespolkl vcelku. Při žvýkání mějte zvíře na očích.</li>
              <li>Vepřové maso syrové nepodávejte kvůli riziku Aujeszkyho choroby.</li>
              <li>Rybu střídmě, nejlépe mořskou a předem zmraženou.</li>
            </ul>
          </div>
          <div>
            <SectionHeading title="Časté chyby začátečníků" />
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
              <li><strong className="text-ink">Příliš mnoho novinek najednou.</strong> Když se objeví potíže, nevíte, co je způsobilo.</li>
              <li><strong className="text-ink">Jen svalovina.</strong> Bez kostí a vnitřností chybí vápník, vitamíny a minerály.</li>
              <li><strong className="text-ink">Moc jater.</strong> Játra jsou výživná, ale ve velkém množství zatěžují trávení.</li>
              <li><strong className="text-ink">Přehnaná přesnost.</strong> Vyváženost se počítá v průběhu týdne, ne v každé misce.</li>
              <li><strong className="text-ink">Stále stejné maso.</strong> Střídání druhů zajistí pestřejší spektrum živin.</li>
              <li><strong className="text-ink">Zapomenutý olej.</strong> Omega-3 mastné kyseliny v mase z chovu často chybí.</li>
              <li><strong className="text-ink">Kosti nevhodné velikosti</strong> nebo tvrdé nosné kosti velkých zvířat, o které si pes může odlomit zub.</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* 9. Startovací balíčky */}
      <Section tone="cream" className="scroll-mt-4">
        <div id="balicky">
          <SectionHeading title="Startovací balíčky">
            Nechcete skládat první nákup sami? Připravili jsme balíčky, které obsahují vše na první týdny přechodu ve správném
            poměru.
          </SectionHeading>
        </div>
        {packs.length > 0 ? (
          <ProductGrid products={packs} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
              <h3>Startovací balíček pro psy</h3>
              <p className="mt-1 text-sm text-muted">
                Drůbeží svalovina, masité kosti, vnitřnosti, zelené bachory a lososový olej. Porce jsou rozdělené podle kroků
                přechodu, takže víte, co kdy otevřít.
              </p>
              <p className="mt-2 text-xs text-muted">Varianty: malý pes (do 10 kg) · střední pes (10–25 kg) · velký pes (nad 25 kg)</p>
            </div>
            <div className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
              <h3>Startovací balíček pro kočky</h3>
              <p className="mt-1 text-sm text-muted">
                Jemně mletá drůbeží směs s kostí, kuřecí srdce, vnitřnosti a taurin. Menší porce, které rozmrazíte přesně podle
                potřeby. Součástí je sáček sušených pamlsků na lákání k nové misce.
              </p>
            </div>
          </div>
        )}
        <p className="mt-4 text-sm text-muted">Ke každému balíčku přikládáme tištěný přehled přechodu krok za krokem.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {packs.length === 0 && (
            <ButtonLink href="#kalkulacka">Poskládat set kalkulačkou</ButtonLink>
          )}
          <ButtonLink href="/rada/zaklad" variant="secondary">
            Nakoupit jednotlivě
          </ButtonLink>
        </div>
      </Section>

      {/* 10. Časté dotazy */}
      <Section tone="paper">
        <SectionHeading title="Časté dotazy" />
        <div className="grid gap-3 md:grid-cols-2">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-[var(--radius-card)] border border-line bg-cream p-4">
              <summary className="cursor-pointer font-display text-[17px] font-semibold marker:text-brick-text">{q}</summary>
              <p className="mt-2 text-sm text-muted">{a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* 11. Poradna */}
      <Section tone="cream">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <div>
            <SectionHeading eyebrow="Poradna" title="Nevíte si rady? Zeptejte se nás.">
              BARFem sami krmíme a rádi vám pomůžeme sestavit jídelníček na míru, vybrat vhodné kosti nebo vyřešit potíže při
              přechodu. Napište nám, co vašeho psa nebo kočku trápí, a ozveme se vám zpravidla do jednoho pracovního dne.
            </SectionHeading>
            <p className="text-sm text-muted">
              Nebo volejte {shop.phone} v otevírací době ({shop.openingHours.map((h) => `${h.days} ${h.hours}`).join(", ")}) nebo
              pište na {shop.email}.
            </p>
            <p className="mt-3 text-xs text-muted">Naše rady nenahrazují veterinární péči. Při zdravotních potížích vždy kontaktujte veterináře.</p>
          </div>
          <InquiryForm />
        </div>
      </Section>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
      <h3 className="text-[17px]">{title}</h3>
      <p className="mt-1 text-sm text-muted">{children}</p>
    </div>
  );
}

function RatioTable({ rows }: { rows: readonly (readonly [string, string, string])[] }) {
  return (
    <table className="mt-3 w-full text-sm">
      <thead>
        <tr className="label text-left text-[10px] text-muted">
          <th className="py-1 font-semibold">Složka</th>
          <th className="py-1 font-semibold">Podíl</th>
          <th className="py-1 font-semibold">Příklady</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map(([a, b, c]) => (
          <tr key={a}>
            <td className="py-1.5 pr-2 font-semibold">{a}</td>
            <td className="py-1.5 pr-2 whitespace-nowrap">{b}</td>
            <td className="py-1.5 text-muted">{c}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Step({ n, title, when, children }: { n: number; title: string; when: string; children: React.ReactNode }) {
  return (
    <li className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
      <p className="label text-[11px] text-brick-text">
        Krok {n} · {when}
      </p>
      <h3 className="mt-1 text-[17px]">{title}</h3>
      <p className="mt-1 text-sm text-muted">{children}</p>
    </li>
  );
}
