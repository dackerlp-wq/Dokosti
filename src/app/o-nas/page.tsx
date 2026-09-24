import type { Metadata } from "next";
import { Logo } from "@/components/ui/logo";
import { Section, SectionHeading } from "@/components/ui/section";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "O nás" };

export default function AboutPage() {
  return (
    <>
      <div className="container-dk grid items-center gap-8 pt-6 md:grid-cols-[1fr_1.4fr] md:pt-10">
        <Logo variant="barevne" width={240} priority />
        <div>
          <p className="label mb-2 text-brick-text">O nás</p>
          <h1>Dvořák a Kostová</h1>
          <p className="mt-4 text-muted">
            Odtud DoKosti. Prodejnu jsme otevřeli, protože jsme sami krmili syrově a pořád jsme za krmivem jezdili
            přes půl kraje. Vlastní krmivo nevyrábíme, vybíráme od výrobců, kterým věříme, a víme, co je v každém
            balíčku.
          </p>
        </div>
      </div>

      <Section tone="cream">
        <div className="grid gap-4 md:grid-cols-3">
          <Value title="Poctivě">
            Víme, co je v každém balíčku, a řekneme to na rovinu. Žádné zázračné sliby.
          </Value>
          <Value title="Srozumitelně">
            BARF umíme vysvětlit i úplnému začátečníkovi. Bez odborné hantýrky a bez poučování.
          </Value>
          <Value title="S nadsázkou">
            Máme rádi zvířata i slovní hříčky. Humor ano, ale nikdy na úkor zákazníka nebo zvířete.
          </Value>
        </div>
      </Section>

      <Section tone="paper">
        <SectionHeading eyebrow="Prodejna" title="Kde nás najdete" />
        <div className="grid gap-8 md:grid-cols-2">
          <address className="not-italic text-muted">
            {SITE.address}
            <br />
            {SITE.phone}
            <br />
            {SITE.email}
          </address>
          <dl className="text-muted">
            {SITE.openingHours.map((o) => (
              <div key={o.days} className="flex justify-between border-b border-line py-2">
                <dt>{o.days}</dt>
                <dd>{o.hours}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-6 max-w-2xl text-muted">
          Nevíte, kolik masa dát? Stavte se, spočítáme to. Vezměte psa, miska s vodou je u dveří.
        </p>
      </Section>
    </>
  );
}

function Value({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
      <h2 className="text-[19px]">{title}</h2>
      <p className="mt-1 text-sm text-muted">{children}</p>
    </div>
  );
}
