"use client";

import { Minus, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { clearPlan, planExtras, planValid, useCartPlan } from "@/lib/cart-plan";
import { loyaltyBalance, previewCoupon, submitOrder, type CheckoutInput, type CouponPreview } from "@/app/(shop)/pokladna/actions";
import { useCart } from "@/components/cart/cart-context";
import { ProductImage } from "@/components/product/product-image";
import { Button, ButtonLink } from "@/components/ui/button";
import { chipClass, Field, StepDisc } from "@/components/ui/field";
import { productName } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { DAY_NAMES, DAY_NAMES_SHORT, type Settings } from "@/lib/settings";
import { INTERVAL_LABEL, nextWeekday, shippingPrice, type PaymentId, type PaymentMethod, type ShippingId, type ShippingMethod } from "@/lib/shipping";

type Props = {
  shipping: ShippingMethod[];
  payment: PaymentMethod[];
  deliveryDays: string[];
  deliveryWindow: string;
  loyalty: Settings["loyalty"];
  subscription: Settings["subscription"];
  /** Dny v týdnu, kdy lze pravidelně dodávat, podle způsobu dodání. */
  weekdays: Record<ShippingId, number[]>;
  /** Předvolený interval z kalkulačky (?predplatne=14). */
  initialInterval?: number;
  /** Předvolený způsob dodání z průvodce (?dodani=rozvoz). */
  initialShipping?: ShippingId;
  /** Z průvodce: položky jen do každé N. dodávky (slug → N), např. olej, který vydrží déle než interval. */
  everyNth?: Record<string, number>;
  /** Údaje z účtu přihlášeného zákazníka. */
  prefill?: { name: string; email: string; phone: string; street: string; city: string; zip: string };
  accountEmail?: string | null;
};

const dateFmt = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric" });

const INTERVALS = [0, 14, 28] as const;
type Interval = (typeof INTERVALS)[number];

export function CheckoutForm({ shipping: SHIPPING, payment: PAYMENT, deliveryDays, deliveryWindow, loyalty, subscription, weekdays, initialInterval = 0, initialShipping, everyNth = {}, prefill, accountEmail }: Props) {
  const cart = useCart();
  const [shipping, setShipping] = useState<ShippingId>(initialShipping && SHIPPING.some((m) => m.id === initialShipping) ? initialShipping : (SHIPPING[0]?.id ?? "odber"));
  // Plán z Krmení na míru uložený u košíku: platí, dokud v košíku zůstávají jeho položky.
  const stored = useCartPlan();
  const plan = planValid(stored, cart.lines) ? stored : null;
  const extras = plan ? planExtras(plan, cart.lines) : [];
  /** Položky navíc k plánu, které mají chodit v každé dodávce (jinak jen v první). */
  const [keep, setKeep] = useState<string[]>([]);
  // Interval: výběr zákazníka, jinak z odkazu (?predplatne=14), jinak z plánu.
  const [intervalChoice, setInterval] = useState<Interval | null>(null);
  const fallbackInterval = initialInterval || plan?.intervalDays || 0;
  const interval: Interval = intervalChoice ?? (subscription.enabled && (INTERVALS as readonly number[]).includes(fallbackInterval) ? (fallbackInterval as Interval) : 0);
  const [weekdayChoice, setWeekdayChoice] = useState<number | null>(null);
  const [payment, setPayment] = useState<PaymentId>(PAYMENT.find((p) => p.id === "hotove")?.id ?? PAYMENT[0]?.id ?? "prevod");
  const [deliveryDate, setDeliveryDate] = useState<string>(deliveryDays[0] ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ number: string; total: number; points: number; subscription?: { token: string; nextDate: string } } | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [balance, setBalance] = useState<number | null>(null);
  const [redeemSteps, setRedeemSteps] = useState(0);
  /** Slevový kód, Kostičky a poznámka jsou schované pod odkazy, dokud je zákazník nepotřebuje. */
  const [couponOpen, setCouponOpen] = useState(false);
  const [kostOpen, setKostOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <div className="mx-auto max-w-[560px] rounded-card bg-paper p-8 text-center">
        <p className="text-eyebrow uppercase text-muted">Hotovo</p>
        <h2 className="mt-1 font-display text-display-md text-green md:text-display-lg">Objednávka {done.number} je u nás</h2>
        <p className="mt-4 text-muted">
          Celkem {formatPrice(done.total)}. Potvrzení pošleme e-mailem. Kdyby něco nesedělo, zavoláme. Děkujeme.
        </p>
        {done.points > 0 && (
          <p className="mt-2 text-muted">Po doručení vám připíšeme {done.points} Kostiček.</p>
        )}
        {done.subscription && (
          <p className="mt-2 text-muted">
            Pravidelný odběr je nastavený, další dodávka {dateFmt.format(new Date(done.subscription.nextDate + "T12:00:00"))}. Přeskočit, změnit nebo zrušit ho
            můžete kdykoli na{" "}
            <Link href={`/predplatne/${done.subscription.token}`} className="text-brick-text underline">
              stránce předplatného
            </Link>
            , odkaz posíláme i e-mailem.
          </p>
        )}
        <div className="mt-6">
          <ButtonLink href="/" size="md">
            Zpět na úvod
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (!cart.ready) return <p className="text-muted">Načítám košík…</p>;
  if (cart.items.length === 0) {
    return (
      <p className="text-muted">
        Košík je prázdný.{" "}
        <Link href="/rada/barf" className="text-brick-text underline">
          Vybrat krmivo
        </Link>
      </p>
    );
  }

  const method = SHIPPING.find((s) => s.id === shipping) ?? SHIPPING[0];
  const shippingCzk = shippingPrice(method, cart.subtotalCzk);
  const couponCzk = coupon?.ok ? Math.min(coupon.discountCzk, cart.subtotalCzk) : 0;
  const subscriptionCzk = interval > 0 && subscription.discountPct > 0 ? Math.round(((cart.subtotalCzk - couponCzk) * subscription.discountPct) / 100) : 0;
  const discountCzk = couponCzk + subscriptionCzk;
  // Den pravidelné dodávky: u rozvozu podle vybraného termínu, jinak volba zákazníka.
  const allowedWeekdays = weekdays[shipping] ?? [];
  const weekday = shipping === "rozvoz" && deliveryDate ? new Date(deliveryDate + "T12:00:00").getDay() : weekdayChoice !== null && allowedWeekdays.includes(weekdayChoice) ? weekdayChoice : (allowedWeekdays[0] ?? 1);
  const firstDate = shipping === "rozvoz" && deliveryDate ? deliveryDate : nextWeekday(weekday);
  const maxSteps = balance === null ? 0 : Math.floor(balance / loyalty.redeemStep);
  const pointsCzk = Math.min(redeemSteps * loyalty.redeemValueCzk, cart.subtotalCzk - discountCzk);
  /** Kolik kroků Kostiček jde nejvýš uplatnit: podle zůstatku a ceny zboží po slevách. */
  const redeemCap = Math.min(maxSteps, Math.floor((cart.subtotalCzk - discountCzk) / loyalty.redeemValueCzk));
  const totalCzk = cart.subtotalCzk - discountCzk - pointsCzk + shippingCzk;
  const pointsBase = loyalty.enabled ? Math.floor((cart.subtotalCzk - discountCzk - pointsCzk) / loyalty.czkPerPoint) : 0;
  // Předplatné: Kostičky navíc v hodnotě pointsBonusPct % z ceny zboží (stejný výpočet jako v databázi).
  const pointsBonus = loyalty.enabled && interval > 0 && subscription.pointsBonusPct > 0 ? Math.round((((cart.subtotalCzk - discountCzk - pointsCzk) * subscription.pointsBonusPct) / 100) * (loyalty.redeemStep / loyalty.redeemValueCzk)) : 0;
  const pointsEarned = pointsBase + pointsBonus;

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCoupon(await previewCoupon(couponInput, cart.subtotalCzk));
  }

  async function checkBalance() {
    if (!email.includes("@")) return;
    setBalance(await loyaltyBalance(email));
    setRedeemSteps(0);
  }
  const belowMin = cart.subtotalCzk < method.minOrderCzk;
  const needsAddress = shipping !== "odber";
  const paymentOptions = PAYMENT.filter((p) => (shipping === "prepravce" ? p.id !== "hotove" : true));

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "");
    const input: CheckoutInput = {
      lines: cart.items.map((i) => ({ slug: i.product.slug, qty: i.qty })),
      shipping,
      payment,
      deliveryDate: shipping === "rozvoz" ? deliveryDate : undefined,
      couponCode: coupon?.ok ? coupon.code : undefined,
      pointsRedeem: redeemSteps * loyalty.redeemStep,
      subscribe: interval > 0 ? { intervalDays: interval, weekday, firstDate, everyNth, plan: plan ? { ...plan, keep } : undefined } : undefined,
      customer: {
        name: get("name"),
        email: get("email"),
        phone: get("phone"),
        street: get("street"),
        city: get("city"),
        zip: get("zip"),
        note: get("note"),
      },
    };
    startTransition(async () => {
      const res = await submitOrder(input);
      if (res.ok) {
        cart.clear();
        clearPlan();
        setDone({ number: res.orderNumber, total: res.totalCzk, points: res.pointsEarned, subscription: res.subscription });
      } else {
        setError(res.error);
      }
    });
  }

  const count = cart.items.reduce((n, i) => n + i.qty, 0);
  const sectionCls = "rounded-card border border-line bg-white p-4 sm:p-5";
  const linkBtn = "min-h-9 self-start text-small font-semibold text-brick-text underline-offset-2 hover:underline";

  return (
    <form onSubmit={onSubmit} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-6">
      <a href="#souhrn" className="flex min-h-13 items-center justify-between gap-3 rounded-control border border-line bg-white px-4 lg:hidden">
        <span className="font-semibold text-green">
          Objednávka · {count} ks{interval > 0 ? ` · ${INTERVAL_LABEL[interval]}` : ""}
        </span>
        <span className="font-display text-[20px] font-black text-green">{formatPrice(totalCzk)}</span>
      </a>

      <div className="flex min-w-0 flex-col gap-4">
        <div className={sectionCls}>
          <fieldset className="min-w-0">
          <StepLegend n={1} title="Doručení" />
          <div className="grid gap-2.5 xl:grid-cols-3">
            {SHIPPING.map((s) => (
              <OptionCard
                key={s.id}
                name="shipping"
                checked={shipping === s.id}
                onChange={() => {
                  setShipping(s.id);
                  if (s.id === "prepravce" && payment === "hotove") setPayment(PAYMENT.find((p) => p.id !== "hotove")?.id ?? "prevod");
                }}
                title={s.name}
                price={shippingPrice(s, cart.subtotalCzk)}
                description={s.description + (s.minOrderCzk ? ` Od ${formatPrice(s.minOrderCzk)}.` : "") + (s.freeFromCzk ? ` Zdarma od ${formatPrice(s.freeFromCzk)}.` : "")}
              />
            ))}
          </div>

          {shipping === "rozvoz" && deliveryDays.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-label text-green">Kdy přivézt</p>
              <div className="flex flex-wrap gap-2">
                {deliveryDays.map((d) => {
                  const date = new Date(d + "T12:00:00");
                  const active = d === deliveryDate;
                  return (
                    <button key={d} type="button" onClick={() => setDeliveryDate(d)} aria-pressed={active} className={chipClass(active, "min-h-12 flex-col gap-0 py-1.5 leading-tight")}>
                      <span className="block text-eyebrow uppercase">{DAY_NAMES[date.getDay()]}</span>
                      {dateFmt.format(date)} · {deliveryWindow}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {needsAddress && (
            <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr]">
              <Field label="Ulice a číslo" name="street" autoComplete="street-address" required className="sm:col-span-2" defaultValue={prefill?.street} />
              <Field label="Město" name="city" autoComplete="address-level2" required defaultValue={prefill?.city} />
              <Field label="PSČ" name="zip" autoComplete="postal-code" required defaultValue={prefill?.zip} />
            </div>
          )}
          </fieldset>
        </div>

        <div className={sectionCls}>
          <fieldset className="min-w-0">
          <StepLegend n={2} title="Kontakt" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Jméno a příjmení" name="name" autoComplete="name" required defaultValue={prefill?.name} />
            <Field label="Telefon" name="phone" type="tel" autoComplete="tel" required defaultValue={prefill?.phone} />
            <Field
              label="E-mail"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="sm:col-span-2"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setBalance(null);
                setRedeemSteps(0);
              }}
            />
          </div>
          {noteOpen ? (
            <label className="mt-3 block">
              <span className="mb-1 block text-label text-green">Poznámka</span>
              <textarea name="note" rows={3} className="px-5 py-3.5" placeholder="Kdy vám můžeme zavolat, jak se k vám dostaneme…" />
            </label>
          ) : (
            <button type="button" onClick={() => setNoteOpen(true)} className={`${linkBtn} mt-2`}>
              + Přidat poznámku k objednávce
            </button>
          )}
          {!accountEmail && (
            <p className="mt-1 text-small text-muted">
              Máte účet?{" "}
              <Link href="/ucet/prihlaseni?next=/pokladna" className="font-semibold text-brick-text underline">
                Přihlaste se
              </Link>{" "}
              a údaje vyplníme za vás, uvidíte i Kostičky.
            </p>
          )}
          </fieldset>
        </div>

        <div className={sectionCls}>
          <fieldset className="min-w-0">
          <StepLegend n={3} title="Platba" />
          <div className="grid gap-2.5 xl:grid-cols-3">
            {paymentOptions.map((p) => (
              <OptionCard key={p.id} name="payment" checked={payment === p.id} onChange={() => setPayment(p.id)} title={p.name} description={p.description} />
            ))}
          </div>
          </fieldset>
        </div>
      </div>

      <aside id="souhrn" className="flex scroll-mt-5 flex-col gap-4 rounded-panel border border-line bg-white p-4 sm:p-5 lg:sticky lg:top-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-[24px] font-semibold text-green">Vaše objednávka</h2>
          <Link href="/kosik" className="text-small font-semibold text-brick-text hover:underline">
            Upravit
          </Link>
        </div>
        <ul className="flex flex-col gap-2.5">
          {cart.items.map(({ product, qty }) => {
            const nth = plan?.once[product.slug] ?? (everyNth[product.slug] > 1 ? everyNth[product.slug] : 0);
            return (
              <li key={product.slug} className="flex items-center gap-2.5">
                <span className="relative size-11 shrink-0 overflow-hidden rounded-control bg-paper">
                  <ProductImage product={product} sizes="44px" className="h-11" />
                  <span className="absolute right-0 bottom-0 rounded-tl-control bg-green px-1 text-[11px] font-bold text-cream">{qty}×</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[14px] leading-snug font-semibold text-ink">{productName(product)}</span>
                  {interval > 0 && nth > 0 && <span className="text-[12px] text-muted">každou {nth}. dodávku</span>}
                </span>
                <span className="shrink-0 text-[14px] font-semibold">{formatPrice(qty * product.priceCzk)}</span>
              </li>
            );
          })}
        </ul>

        {subscription.enabled && (
          <div className="flex flex-col gap-2 rounded-card bg-paper p-3.5">
            <span className="text-label text-green">Jak často</span>
            <div role="radiogroup" aria-label="Jak často" className="grid grid-cols-3 gap-1.5">
              {INTERVALS.map((i) => (
                <button key={i} type="button" role="radio" aria-checked={interval === i} onClick={() => setInterval(i)} className={chipClass(interval === i, "min-h-11 px-1.5 text-[13px]")}>
                  {i === 0 ? "Jednou" : i === 14 ? "Po 2 týdnech" : "Po 4 týdnech"}
                </button>
              ))}
            </div>
            {interval === 0 ? (
              <p className="text-small text-muted">
                Jen tento nákup.{" "}
                {subscription.pointsBonusPct > 0 || subscription.discountPct > 0 ? (
                  <>
                    Pravidelně{subscription.discountPct > 0 ? ` se slevou ${subscription.discountPct} %` : ` s Kostičkami navíc`},{" "}
                  </>
                ) : null}
                <Link href="/pravidelne-dodavky" className="text-brick-text underline">
                  jak to funguje
                </Link>
                .
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 text-small text-muted">
                {shipping !== "rozvoz" && allowedWeekdays.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-label text-green">{shipping === "odber" ? "Den vyzvednutí" : "Den odeslání"}</span>
                    {allowedWeekdays.map((d) => (
                      <button key={d} type="button" onClick={() => setWeekdayChoice(d)} aria-pressed={weekday === d} className={chipClass(weekday === d, "min-h-9 px-2.5")}>
                        {DAY_NAMES_SHORT[d]}
                      </button>
                    ))}
                  </div>
                )}
                <p>
                  První dodávka {dateFmt.format(new Date(firstDate + "T12:00:00"))}, další {INTERVAL_LABEL[interval]} v {DAY_NAMES[weekday]}. {subscription.reminderDaysBefore} dny předem napíšeme, co přijde; přeskočíte nebo zrušíte kdykoli.
                </p>
                {plan && plan.b.length > 0 && <p>Maso se střídá, příští dodávka: {plan.b.map((x) => `${x.qty}× ${x.name}`).join(", ")}.</p>}
                {plan && extras.length > 0 && (
                  <ul className="flex flex-col gap-1 rounded-control bg-white p-2.5">
                    {extras.map((x) => {
                      const p = cart.items.find((i) => i.product.slug === x.slug)?.product;
                      const on = keep.includes(x.slug);
                      return (
                        <li key={x.slug} className="flex flex-wrap items-center justify-between gap-1.5">
                          <span>
                            {p ? productName(p) : x.slug}: {on ? "v každé dodávce" : "jen teď"}
                          </span>
                          <button type="button" onClick={() => setKeep(on ? keep.filter((k) => k !== x.slug) : [...keep, x.slug])} className="font-semibold text-brick-text underline">
                            {on ? "Jen teď" : "Posílat pokaždé"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {couponOpen || coupon ? (
          <div>
            <div className="flex gap-2">
              <label className="flex-1">
                <span className="sr-only">Slevový kód</span>
                <input
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value.toUpperCase());
                    setCoupon(null);
                  }}
                  placeholder="Slevový kód"
                  className="min-h-11 px-3.5 uppercase"
                />
              </label>
              <Button type="button" variant="secondary" className="min-h-11" onClick={applyCoupon} disabled={!couponInput.trim()}>
                Použít
              </Button>
            </div>
            {coupon && !coupon.ok && <p className="mt-1 text-small text-brick-text">{coupon.error}</p>}
            {coupon?.ok && (
              <p className="mt-1 text-small text-green">
                Kód {coupon.code} ({coupon.label}): sleva {formatPrice(couponCzk)}.
              </p>
            )}
          </div>
        ) : (
          <button type="button" onClick={() => setCouponOpen(true)} className={`${linkBtn} -my-1`}>
            Máte slevový kód?
          </button>
        )}

        {loyalty.enabled &&
          (kostOpen ? (
            <div className="flex flex-col gap-2 rounded-card border border-line p-3.5 text-small">
              <span className="text-label text-green">Kostičky</span>
              {!accountEmail ? (
                <p className="text-muted">
                  <Link href="/ucet/prihlaseni?next=/pokladna" className="font-semibold text-brick-text underline">
                    Přihlaste se
                  </Link>{" "}
                  a uplatněte Kostičky jako slevu. Za tento nákup vám je připíšeme i tak.
                </p>
              ) : email.trim().toLowerCase() !== accountEmail.trim().toLowerCase() ? (
                <p className="text-muted">Pro uplatnění Kostiček musí e-mail objednávky odpovídat e-mailu vašeho účtu.</p>
              ) : balance === null ? (
                <p className="text-muted">Načítám zůstatek…</p>
              ) : maxSteps === 0 ? (
                <p className="text-muted">
                  Máte {balance} Kostiček. Uplatnit jde od {loyalty.redeemStep}, každých {loyalty.redeemStep} je sleva {formatPrice(loyalty.redeemValueCzk)}.
                </p>
              ) : (
                <>
                  <p className="text-muted">
                    Máte <b className="text-ink">{balance} Kostiček</b>. Každých {loyalty.redeemStep} je sleva {formatPrice(loyalty.redeemValueCzk)}.
                  </p>
                  <div className="flex items-center gap-2.5">
                    <button type="button" onClick={() => setRedeemSteps(Math.max(0, redeemSteps - 1))} aria-label="Uplatnit méně Kostiček" className="inline-flex size-11 items-center justify-center rounded-full border-2 border-line bg-white text-green hover:border-muted">
                      <Minus className="size-4.5" strokeWidth={1.75} aria-hidden />
                    </button>
                    <span className="flex-1 text-center text-[15px]">
                      <b className="text-green">{redeemSteps * loyalty.redeemStep} Kostiček</b> <span className="text-muted">= {formatPrice(redeemSteps * loyalty.redeemValueCzk)}</span>
                    </span>
                    <button type="button" onClick={() => setRedeemSteps(Math.min(redeemCap, redeemSteps + 1))} aria-label="Uplatnit více Kostiček" className="inline-flex size-11 items-center justify-center rounded-full border-2 border-line bg-white text-green hover:border-muted">
                      <Plus className="size-4.5" strokeWidth={1.75} aria-hidden />
                    </button>
                  </div>
                  <button type="button" onClick={() => setRedeemSteps(redeemCap)} className="self-start font-semibold text-brick-text hover:underline">
                    Uplatnit co nejvíc
                  </button>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setKostOpen(true);
                if (accountEmail && email.trim().toLowerCase() === accountEmail.trim().toLowerCase()) void checkBalance();
              }}
              className={`${linkBtn} -my-1`}
            >
              Uplatnit Kostičky
            </button>
          ))}

        <dl className="flex flex-col gap-1.5 border-t border-line pt-3 text-[14px]">
          <div className="flex justify-between">
            <dt className="text-muted">Zboží</dt>
            <dd>{formatPrice(cart.subtotalCzk)}</dd>
          </div>
          {couponCzk > 0 && (
            <div className="flex justify-between text-brick-text">
              <dt>Sleva {coupon?.ok ? coupon.code : ""}</dt>
              <dd>−{formatPrice(couponCzk)}</dd>
            </div>
          )}
          {subscriptionCzk > 0 && (
            <div className="flex justify-between text-brick-text">
              <dt>Pravidelný odběr −{subscription.discountPct} %</dt>
              <dd>−{formatPrice(subscriptionCzk)}</dd>
            </div>
          )}
          {pointsCzk > 0 && (
            <div className="flex justify-between text-brick-text">
              <dt>Kostičky</dt>
              <dd>−{formatPrice(pointsCzk)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">Doprava</dt>
            <dd>{shippingCzk === 0 ? "zdarma" : formatPrice(shippingCzk)}</dd>
          </div>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div>
              <dt className="font-bold text-green">Celkem</dt>
              <dd className="font-display text-[30px] leading-tight font-black text-green">{formatPrice(totalCzk)}</dd>
            </div>
            <Image src="/maskot/cerveny-taska.webp" alt="" width={90} height={96} className="-mb-1 h-19 w-auto" aria-hidden />
          </div>
        </dl>
        {pointsEarned > 0 && (
          <p className="-mt-2 text-[13px] text-muted">
            Získáte {pointsEarned} Kostiček{pointsBonus > 0 ? `, z toho ${pointsBonus} navíc za pravidelnou dodávku` : ""}.
          </p>
        )}

        {belowMin && (
          <p className="rounded-control border border-brick-text bg-white p-3 text-small font-semibold text-brick-text">
            Pro tento způsob dodání je minimální objednávka {formatPrice(method.minOrderCzk)}.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-control border border-brick-text bg-white p-3 text-small font-semibold text-brick-text">
            {error}
          </p>
        )}

        <Button type="submit" variant="action" size="lg" className="w-full" disabled={pending || belowMin}>
          {pending ? "Odesílám…" : `${interval > 0 ? "Objednat pravidelně" : "Objednat"} · ${formatPrice(totalCzk)}`}
        </Button>
        <p className="-mt-2 text-center text-[12px] text-muted">
          Odesláním souhlasíte s{" "}
          <Link href="/obchodni-podminky" className="underline">
            obchodními podmínkami
          </Link>
          .
        </p>
      </aside>
    </form>
  );
}

/** Volba dopravy nebo platby: karta s názvem, cenou a krátkým popisem. */
function OptionCard({ name, checked, onChange, title, description, price }: { name: string; checked: boolean; onChange: () => void; title: string; description: string; price?: number }) {
  return (
    <label className={`flex cursor-pointer flex-col gap-1 rounded-card border-2 p-3.5 transition-colors duration-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-green ${checked ? "border-green bg-paper" : "border-line bg-white hover:border-muted"}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      <span className="flex items-baseline justify-between gap-2 font-semibold text-green">
        <span>{title}</span>
        {price !== undefined && <span className="shrink-0">{price === 0 ? "zdarma" : formatPrice(price)}</span>}
      </span>
      <span className="text-[13px] leading-snug text-muted">{description}</span>
    </label>
  );
}

/** Nadpis kroku pokladny: číslo v zeleném disku a název. */
function StepLegend({ n, title }: { n: number; title: string }) {
  return (
    <legend className="mb-4 flex items-center gap-3">
      <StepDisc n={n} className="size-8 text-[15px]" />
      <span className="text-heading-md text-green">{title}</span>
    </legend>
  );
}
