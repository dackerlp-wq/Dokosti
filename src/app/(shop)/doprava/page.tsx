import type { Metadata } from "next";
import { Section, SectionHeading } from "@/components/ui/section";
import { formatPrice } from "@/lib/format";
import { DAY_NAMES } from "@/lib/settings";
import { getSettings } from "@/lib/settings";
import { paymentMethods, shippingMethods } from "@/lib/shipping";

export const metadata: Metadata = {
  title: "Doprava a platba",
  description: "Osobní odběr v Kladně, rozvoz po okolí a chlazený přepravce po celé ČR.",
};

export default async function ShippingPage() {
  const settings = await getSettings();
  const SHIPPING = shippingMethods(settings);
  const PAYMENT = paymentMethods(settings);
  const rozvozDny = settings.shipping.rozvoz.days.map((d) => DAY_NAMES[d]).join(" a ");
  return (
    <>
      <div className="container-dk pt-6 md:pt-10">
        <p className="label mb-2 text-brick-text">Doručení</p>
        <h1>Mražené dovezeme mražené</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Syrové krmivo nesmí cestou rozmrznout. Proto nejde poslat běžným balíkem ani na výdejní místo. Máme tři
          cesty, jak ho dostat k vám.
        </p>
      </div>

      <Section tone="cream">
        <div className="grid gap-4 md:grid-cols-3">
          {SHIPPING.map((s) => (
            <div key={s.id} className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
              <h2 className="text-[19px]">{s.name}</h2>
              <p className="mt-1 font-display text-[19px] font-semibold">
                {s.priceCzk === 0 ? "zdarma" : formatPrice(s.priceCzk)}
              </p>
              <p className="mt-2 text-sm text-muted">
                {s.description}
                {s.id === "rozvoz" && ` Jezdíme ${rozvozDny}, ${settings.shipping.rozvoz.window}.`}
              </p>
              <ul className="mt-3 space-y-1 text-xs text-muted">
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
            <div key={p.id} className="rounded-[var(--radius-card)] border border-line bg-cream p-4">
              <h3>{p.name}</h3>
              <p className="mt-1 text-sm text-muted">{p.description}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="cream">
        <SectionHeading eyebrow="Po doručení" title="Co s balíkem" />
        <ol className="max-w-2xl list-decimal space-y-2 pl-5 text-sm text-muted">
          <li>Balík rozbalte hned a krmivo dejte do mrazáku. Suchý led nechte odpařit venku, neberte ho do ruky.</li>
          <li>Lehce namrzlé okraje jsou v pořádku. Rozmražené a teplé krmivo ne, v tom případě nám zavolejte.</li>
          <li>Krmivo, které chcete použít, rozmrazujte v lednici, ne na lince.</li>
        </ol>
      </Section>
    </>
  );
}
