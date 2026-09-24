import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/ui/section";
import { formatPrice } from "@/lib/format";
import { PAYMENT, SHIPPING } from "@/lib/shipping";

export const metadata: Metadata = {
  title: "Doprava a platba",
  description: "Osobní odběr v Kladně, rozvoz po okolí a chlazený přepravce po celé ČR.",
};

export default function ShippingPage() {
  return (
    <>
      <div className="container-dk pt-10 md:pt-14">
        <p className="label mb-2 text-brick-text">Doručení</p>
        <h1>Mražené dovezeme mražené</h1>
        <p className="mt-4 max-w-2xl text-muted">
          Syrové krmivo nesmí cestou rozmrznout. Proto nejde poslat běžným balíkem ani na výdejní místo. Máme tři
          cesty, jak ho dostat k vám.
        </p>
      </div>

      <Section tone="cream">
        <div className="grid gap-4 md:grid-cols-3">
          {SHIPPING.map((s) => (
            <div key={s.id} className="rounded-[var(--radius-card)] border border-line bg-paper p-6">
              <h2 className="text-[24px]">{s.name}</h2>
              <p className="mt-2 font-display text-[22px] font-semibold">
                {s.priceCzk === 0 ? "zdarma" : formatPrice(s.priceCzk)}
              </p>
              <p className="mt-3 text-muted">{s.description}</p>
              <ul className="mt-4 space-y-1 text-sm text-muted">
                {s.minOrderCzk > 0 && <li>Minimální objednávka {formatPrice(s.minOrderCzk)}.</li>}
                {s.freeFromCzk && <li>Zdarma od {formatPrice(s.freeFromCzk)}.</li>}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="paper">
        <SectionHeading eyebrow="Platba" title="Jak zaplatit" />
        <div className="grid gap-4 md:grid-cols-3">
          {PAYMENT.map((p) => (
            <div key={p.id} className="rounded-[var(--radius-card)] border border-line bg-cream p-6">
              <h3 className="text-[22px]">{p.name}</h3>
              <p className="mt-2 text-muted">{p.description}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="cream">
        <SectionHeading eyebrow="Po doručení" title="Co s balíkem" />
        <ol className="max-w-2xl list-decimal space-y-3 pl-5 text-muted">
          <li>Balík rozbalte hned a krmivo dejte do mrazáku. Suchý led nechte odpařit venku, neberte ho do ruky.</li>
          <li>Lehce namrzlé okraje jsou v pořádku. Rozmražené a teplé krmivo ne, v tom případě nám zavolejte.</li>
          <li>Krmivo, které chcete použít, rozmrazujte v lednici, ne na lince.</li>
        </ol>
      </Section>
    </>
  );
}
