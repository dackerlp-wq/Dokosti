"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-context";
import { Button, ButtonLink } from "@/components/ui/button";
import { calcDailyDose, type Activity, type Age, type Animal, type Body, type CalcResult } from "@/lib/barf";
import { productName, type Product } from "@/lib/catalog";
import { formatPrice, formatWeight } from "@/lib/format";

/**
 * Kalkulačka dávky s doporučením z aktuální nabídky. Dostane publikované produkty
 * skladem a poskládá z nich set na dva týdny: hotový mix (Základ), masité kosti,
 * olej. Množství balení dopočítá podle vypočtené dávky.
 */
type Reco = { product: Product; qty: number; why: string };

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const has = (p: Product, ...words: string[]) => words.some((w) => fold(p.variant + " " + p.intro).includes(fold(w)));

function recommend(products: Product[], animal: Animal, r: CalcResult, weightKg: number, days = 14): Reco[] {
  const pool = products.filter((p) => p.inStock && p.animals.includes(animal));
  const out: Reco[] = [];

  // Hotový mix: pro začátek drůbeží, jinak první ze Základu. Pokryje ~85 % (pes) / 90 % (kočka) dávky.
  const mixes = pool.filter((p) => p.line === "zaklad" && p.storage !== "suche");
  const mix = mixes.find((p) => has(p, "drůbeží", "kuřecí", "krůtí")) ?? mixes[0];
  if (mix) {
    const grams = r.dailyGrams * (animal === "pes" ? 0.85 : 0.9) * days;
    out.push({ product: mix, qty: Math.max(1, Math.ceil(grams / mix.weightGrams)), why: "hotový mix, základ misky" });
  }

  // Masité kosti podle velikosti: do 10 kg a kočky krky, větší psi křídla nebo žebra.
  const bones = pool.filter((p) => p.line === "kosti");
  const bone =
    animal === "kocka" || weightKg < 10
      ? bones.find((p) => has(p, "krk")) ?? bones[0]
      : bones.find((p) => has(p, "křídl", "žebr")) ?? bones[0];
  if (bone) {
    const grams = r.dailyGrams * 0.12 * days;
    out.push({ product: bone, qty: Math.max(1, Math.ceil(grams / bone.weightGrams)), why: "masité kosti na hryzání" });
  }

  // Olej s omega-3: jedno balení, dávka zhruba 1 ml na 5 kg denně.
  const oil = pool.find((p) => p.line === "navic" && has(p, "olej"));
  if (oil) out.push({ product: oil, qty: 1, why: "omega-3, přidat do misky" });

  // Pes: zelenina, když je v nabídce.
  if (animal === "pes") {
    const veg = pool.find((p) => p.line === "navic" && has(p, "zelenin"));
    if (veg) {
      const grams = r.dailyGrams * 0.15 * days;
      out.push({ product: veg, qty: Math.max(1, Math.ceil(grams / veg.weightGrams)), why: "rostlinná část" });
    }
  }
  return out;
}

export function BarfCalculator({ products }: { products: Product[] }) {
  const cart = useCart();
  const [animal, setAnimal] = useState<Animal>("pes");
  const [age, setAge] = useState<Age>("dospely");
  const [activity, setActivity] = useState<Activity>("bezna");
  const [body, setBody] = useState<Body>("idealni");
  const [weight, setWeight] = useState("");
  const [result, setResult] = useState<CalcResult | null>(null);
  const [recos, setRecos] = useState<Reco[]>([]);
  const [added, setAdded] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const kg = Number(weight.replace(",", "."));
    if (!(kg > 0)) return;
    const r = calcDailyDose({ animal, age, weightKg: kg, activity, body });
    setResult(r);
    setRecos(recommend(products, animal, r, kg));
    setAdded(false);
  }

  const total = recos.reduce((n, r) => n + r.qty * r.product.priceCzk, 0);

  return (
    <div id="kalkulacka" className="rounded-[var(--radius-card)] border border-line bg-paper p-5 md:p-6">
      <h2 className="text-[24px]">Spočítejte si denní dávku</h2>
      <p className="mt-1 text-sm text-muted">Vyplňte pár údajů a my vám řekneme, kolik krmiva připravit a jak ho rozdělit.</p>

      <form onSubmit={onSubmit} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Kdo bude jíst?">
          <select value={animal} onChange={(e) => setAnimal(e.target.value as Animal)}>
            <option value="pes">Pes</option>
            <option value="kocka">Kočka</option>
          </select>
        </Field>
        <Field label="Věk">
          <select value={age} onChange={(e) => setAge(e.target.value as Age)}>
            <option value="mlade">{animal === "pes" ? "Štěně" : "Kotě"}</option>
            <option value="dospely">Dospělý</option>
            <option value="senior">Senior</option>
          </select>
        </Field>
        <Field label="Hmotnost (kg)" hint={age === "mlade" ? "aktuální hmotnost" : undefined}>
          <input type="number" inputMode="decimal" min={0.5} max={100} step={0.1} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="např. 20" required />
        </Field>
        <Field label="Aktivita">
          <select value={activity} onChange={(e) => setActivity(e.target.value as Activity)}>
            <option value="nizka">Nízká</option>
            <option value="bezna">Běžná</option>
            <option value="vysoka">Vysoká</option>
          </select>
        </Field>
        <Field label="Postava">
          <select value={body} onChange={(e) => setBody(e.target.value as Body)}>
            <option value="hubeny">Hubenější</option>
            <option value="idealni">Ideální</option>
            <option value="pri-tele">Při těle</option>
          </select>
        </Field>
        <div className="sm:col-span-2 lg:col-span-5">
          <Button type="submit">Spočítat</Button>
        </div>
      </form>

      {result && (
        <div className="mt-5 border-t border-line pt-5">
          <p className="text-lg">
            {animal === "pes" ? "Váš pes" : "Vaše kočka"} potřebuje přibližně <strong>{result.dailyGrams} g</strong> krmiva denně, tedy asi{" "}
            <strong>{result.weeklyKg.toLocaleString("cs-CZ")} kg</strong> týdně.
          </p>
          <p className="mt-2 text-sm text-muted">Rozpis: {result.breakdown.map((b) => `${b.label} ${b.grams} g`).join(" · ")}</p>
          <p className="mt-1 text-xs text-muted">
            Výpočet je orientační ({result.pct} % hmotnosti). Po dvou až třech týdnech zkontrolujte hmotnost a dávku případně upravte.
          </p>

          {recos.length > 0 ? (
            <div className="mt-5">
              <p className="label text-[11px] text-brick-text">Doporučení z naší nabídky na 14 dní</p>
              <ul className="mt-2 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-cream">
                {recos.map((r) => (
                  <li key={r.product.slug} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                    <div>
                      <Link href={`/produkt/${r.product.slug}`} className="font-semibold hover:underline">
                        {productName(r.product)}
                      </Link>
                      <span className="text-muted">
                        {" "}
                        · {formatWeight(r.product.weightGrams)} · {r.why}
                      </span>
                    </div>
                    <div className="whitespace-nowrap">
                      {r.qty} × {formatPrice(r.product.priceCzk)}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="action"
                  onClick={() => {
                    recos.forEach((r) => cart.add(r.product.slug, r.qty));
                    setAdded(true);
                  }}
                >
                  {added ? "Přidáno do košíku" : `Přidat vše do košíku · ${formatPrice(total)}`}
                </Button>
                {added && (
                  <ButtonLink href="/kosik" variant="secondary">
                    Do košíku
                  </ButtonLink>
                )}
                <Link href={`/rada/zaklad?zvire=${animal}`} className="text-sm text-green underline">
                  Raději si vybrat sám
                </Link>
              </div>
              <p className="mt-2 text-xs text-muted">
                Množství je spočítané na dva týdny přechodu. Doporučujeme začít jednoduchým mixem a další suroviny přidávat postupně, jak
                popisujeme níže.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">Pro tuto kombinaci zrovna nemáme skladem hotový set. Stavte se v prodejně, poskládáme ho spolu.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label mb-1 block text-[11px] text-muted">
        {label}
        {hint && <span className="ml-1 normal-case tracking-normal">({hint})</span>}
      </span>
      {children}
    </label>
  );
}
