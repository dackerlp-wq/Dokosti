import Link from "next/link";
import { KIND_INFO, type MasoKind } from "@/lib/catalog";
import { KIND_TONE } from "@/lib/kind-tone";

/** Skladba misky dospělého psa (stejné cíle jako plán Krmení na míru, viz targetComposition v lib/barf.ts). */
const SHARES: { kind: MasoKind; pct: number; label: string }[] = [
  { kind: "svalovina", pct: 70, label: "svalovina" },
  { kind: "kosti", pct: 20, label: "maso s kostí" },
  { kind: "vnitrnosti", pct: 10, label: "vnitřnosti" },
];

const STEPS: { kind: MasoKind; title: string; text: string }[] = [
  { kind: "svalovina", title: "Základ je svalovina", text: "Zhruba 70 % misky. Srdce, žaludky a dršťky se počítají sem. Druhy masa střídejte, ať jsou aspoň tři za dva týdny." },
  { kind: "kosti", title: "Maso s kostí na vápník", text: "Asi pětina misky. Krky a křídla jsou zhruba z třetiny kost, v misce to dá kolem 8 % kosti, se kterými počítá plán. Místo nich jde i mleté maso s kostí. Vždy syrové. Malí psi krky, střední křídla, velcí stehna a sekané kuře." },
  { kind: "vnitrnosti", title: "Vnitřnosti po troškách", text: "Asi 10 % misky: polovinu játra, polovinu ledvinky nebo další vnitřnosti. Játra nejvýš kolem 5 %, mají hodně vitamínu A. Na začátku BARFu je přidejte až po dvou týdnech." },
  { kind: "ryby", title: "Ryba jednou týdně", text: "Losos nebo šproty místo jedné porce masa. Když ryba v misce není, doplní omega-3 olej." },
];

/** Návod na řadě Maso, kosti a vnitřnosti: barvy odpovídají štítkům a proužkům na kartách produktů. */
export function MasoGuide() {
  return (
    <section id="jak-skladat" className="scroll-mt-20 border-t border-line bg-white px-5 py-10 md:py-14">
      <div className="mx-auto max-w-site">
        <h2 className="font-display text-display-md text-ink">Jak z toho složit misku</h2>
        <p className="mt-2 max-w-text">Pro dospělého psa, podle obecně uváděných zásad syrového krmení. Je to výchozí bod, ne výživový rozbor: podle postavy psa dávku upravíte, podle věku, váhy a pohybu ji spočítá plán.</p>

        <div className="mt-6 flex h-10 overflow-hidden rounded-control" role="img" aria-label="Skladba misky: 70 % svalovina, 20 % masité kosti, 10 % vnitřnosti">
          {SHARES.map((s) => (
            <span key={s.kind} className={`flex items-center justify-center text-small font-bold text-white ${KIND_TONE[s.kind].bar}`} style={{ width: `${s.pct}%` }}>
              {s.pct} %
            </span>
          ))}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-small">
          {SHARES.map((s) => (
            <li key={s.kind} className="inline-flex items-center gap-1.5">
              <span className={`size-2.5 rounded-full ${KIND_TONE[s.kind].dot}`} aria-hidden />
              {s.label}
            </li>
          ))}
          <li className="inline-flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${KIND_TONE.ryby.dot}`} aria-hidden />
            ryba 1× týdně místo masa
          </li>
        </ul>

        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.kind} className="flex flex-col gap-2 rounded-card border border-line bg-paper p-5">
              <span className={`inline-flex size-8 items-center justify-center rounded-full font-bold text-white ${KIND_TONE[s.kind].bar}`}>{i + 1}</span>
              <h3 className={`text-[1.0625rem] font-bold ${KIND_TONE[s.kind].text}`}>{s.title}</h3>
              <p className="text-small">{s.text}</p>
              <Link href={`/rada/maso/${s.kind}`} className="mt-auto text-small font-semibold text-brick-text hover:underline">
                {KIND_INFO[s.kind].title} →
              </Link>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-wrap items-center gap-4 rounded-panel bg-green p-6 text-cream">
          <p className="flex-1 basis-80">
            <strong className="text-white">Nechcete počítat?</strong> Plán Krmení na míru spočítá dávku pro vaše zvíře a složí nákup za vás. Je zdarma a bez závazku.
          </p>
          <Link href="/krmeni-na-miru" className="inline-flex min-h-11 items-center rounded-control bg-cream px-5 text-button text-green hover:bg-white">
            Sestavit plán
          </Link>
        </div>
        <p className="mt-4 text-small text-muted">Kočky, štěňata a zvířata se zdravotními potížemi mají jiné potřeby. Poraďte se v prodejně, nebo s veterinářem.</p>
      </div>
    </section>
  );
}
