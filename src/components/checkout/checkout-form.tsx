"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { loyaltyBalance, previewCoupon, submitOrder, type CheckoutInput, type CouponPreview } from "@/app/(shop)/pokladna/actions";
import { useCart } from "@/components/cart/cart-context";
import { Button, ButtonLink } from "@/components/ui/button";
import { productName } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { DAY_NAMES, type Settings } from "@/lib/settings";
import { shippingPrice, type PaymentId, type PaymentMethod, type ShippingId, type ShippingMethod } from "@/lib/shipping";

type Props = {
  shipping: ShippingMethod[];
  payment: PaymentMethod[];
  deliveryDays: string[];
  deliveryWindow: string;
  loyalty: Settings["loyalty"];
  /** Údaje z účtu přihlášeného zákazníka. */
  prefill?: { name: string; email: string; phone: string; street: string; city: string; zip: string };
};

const dateFmt = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric" });

export function CheckoutForm({ shipping: SHIPPING, payment: PAYMENT, deliveryDays, deliveryWindow, loyalty, prefill }: Props) {
  const cart = useCart();
  const [shipping, setShipping] = useState<ShippingId>(SHIPPING[0]?.id ?? "odber");
  const [payment, setPayment] = useState<PaymentId>(PAYMENT.find((p) => p.id === "hotove")?.id ?? PAYMENT[0]?.id ?? "prevod");
  const [deliveryDate, setDeliveryDate] = useState<string>(deliveryDays[0] ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ number: string; total: number; points: number } | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [balance, setBalance] = useState<number | null>(null);
  const [redeemSteps, setRedeemSteps] = useState(0);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <div className="max-w-xl rounded-[var(--radius-card)] border border-line bg-paper p-8">
        <p className="label text-brick-text">Hotovo</p>
        <h2 className="mt-1">Objednávka {done.number} je u nás</h2>
        <p className="mt-4 text-muted">
          Celkem {formatPrice(done.total)}. Potvrzení pošleme e-mailem. Kdyby něco nesedělo, zavoláme. Děkujeme.
        </p>
        {done.points > 0 && (
          <p className="mt-2 text-muted">Po doručení vám připíšeme {done.points} Kostiček.</p>
        )}
        <div className="mt-6">
          <ButtonLink href="/">Zpět na úvod</ButtonLink>
        </div>
      </div>
    );
  }

  if (!cart.ready) return <p className="text-muted">Načítám košík…</p>;
  if (cart.items.length === 0) {
    return (
      <p className="text-muted">
        Košík je prázdný.{" "}
        <Link href="/rada/zaklad" className="text-green underline">
          Vybrat krmivo
        </Link>
      </p>
    );
  }

  const method = SHIPPING.find((s) => s.id === shipping) ?? SHIPPING[0];
  const shippingCzk = shippingPrice(method, cart.subtotalCzk);
  const discountCzk = coupon?.ok ? Math.min(coupon.discountCzk, cart.subtotalCzk) : 0;
  const maxSteps = balance === null ? 0 : Math.floor(balance / loyalty.redeemStep);
  const pointsCzk = Math.min(redeemSteps * loyalty.redeemValueCzk, cart.subtotalCzk - discountCzk);
  const totalCzk = cart.subtotalCzk - discountCzk - pointsCzk + shippingCzk;
  const pointsEarned = loyalty.enabled ? Math.floor((cart.subtotalCzk - discountCzk - pointsCzk) / loyalty.czkPerPoint) : 0;

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
      lines: cart.lines,
      shipping,
      payment,
      deliveryDate: shipping === "rozvoz" ? deliveryDate : undefined,
      couponCode: coupon?.ok ? coupon.code : undefined,
      pointsRedeem: redeemSteps * loyalty.redeemStep,
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
        setDone({ number: res.orderNumber, total: res.totalCzk, points: res.pointsEarned });
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        <fieldset>
          <legend className="mb-3 text-[20px] font-display font-semibold">Způsob dodání</legend>
          <div className="space-y-2">
            {SHIPPING.map((s) => (
              <RadioCard
                key={s.id}
                name="shipping"
                checked={shipping === s.id}
                onChange={() => {
                  setShipping(s.id);
                  if (s.id === "prepravce" && payment === "hotove") setPayment(PAYMENT.find((p) => p.id !== "hotove")?.id ?? "prevod");
                }}
                title={s.name}
                price={shippingPrice(s, cart.subtotalCzk)}
                description={
                  s.description +
                  (s.minOrderCzk ? ` Minimální objednávka ${formatPrice(s.minOrderCzk)}.` : "") +
                  (s.freeFromCzk ? ` Zdarma od ${formatPrice(s.freeFromCzk)}.` : "")
                }
              />
            ))}
          </div>
        </fieldset>

        {shipping === "rozvoz" && deliveryDays.length > 0 && (
          <fieldset>
            <legend className="mb-3 text-[20px] font-display font-semibold">Den rozvozu</legend>
            <div className="flex flex-wrap gap-2">
              {deliveryDays.map((d) => {
                const date = new Date(d + "T12:00:00");
                const active = d === deliveryDate;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDeliveryDate(d)}
                    aria-pressed={active}
                    className={`rounded-[var(--radius-control)] border px-4 py-2 text-sm ${
                      active ? "border-green bg-green text-cream" : "border-line bg-paper hover:border-green"
                    }`}
                  >
                    <span className="label block text-[11px]">{DAY_NAMES[date.getDay()]}</span>
                    {dateFmt.format(date)} · {deliveryWindow}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className="mb-3 text-[20px] font-display font-semibold">Platba</legend>
          <div className="space-y-2">
            {paymentOptions.map((p) => (
              <RadioCard
                key={p.id}
                name="payment"
                checked={payment === p.id}
                onChange={() => setPayment(p.id)}
                title={p.name}
                description={p.description}
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-[20px] font-display font-semibold">Kontakt</legend>
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
        </fieldset>

        {needsAddress && (
          <fieldset>
            <legend className="mb-3 text-[20px] font-display font-semibold">Adresa doručení</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Ulice a číslo" name="street" autoComplete="street-address" required className="sm:col-span-2" defaultValue={prefill?.street} />
              <Field label="Město" name="city" autoComplete="address-level2" required defaultValue={prefill?.city} />
              <Field label="PSČ" name="zip" autoComplete="postal-code" required defaultValue={prefill?.zip} />
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className="mb-3 text-[20px] font-display font-semibold">Sleva</legend>
          <div className="space-y-4">
            <div>
              <label htmlFor="coupon" className="label mb-1 block text-[11px] text-muted">
                Slevový kód
              </label>
              <div className="flex gap-2">
                <input
                  id="coupon"
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value.toUpperCase());
                    setCoupon(null);
                  }}
                  placeholder="Např. VITEJTE"
                  className="uppercase"
                />
                <Button type="button" variant="secondary" onClick={applyCoupon} disabled={!couponInput.trim()}>
                  Použít
                </Button>
              </div>
              {coupon && !coupon.ok && <p className="mt-1 text-sm text-brick-text">{coupon.error}</p>}
              {coupon?.ok && (
                <p className="mt-1 text-sm text-green">
                  Kód {coupon.code} ({coupon.label}): sleva {formatPrice(discountCzk)}.
                </p>
              )}
            </div>

            {loyalty.enabled && (
              <div>
                <p className="label mb-1 text-[11px] text-muted">Kostičky</p>
                {balance === null ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                    <span>Sbíráte Kostičky? Vyplňte e-mail a zjistěte stav.</span>
                    <Button type="button" variant="secondary" onClick={checkBalance} disabled={!email.includes("@")}>
                      Zjistit stav
                    </Button>
                  </div>
                ) : maxSteps === 0 ? (
                  <p className="text-sm text-muted">
                    Máte {balance} Kostiček. Uplatnit jde po {loyalty.redeemStep}, každých {loyalty.redeemStep} je {formatPrice(loyalty.redeemValueCzk)}.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span>Máte {balance} Kostiček. Uplatnit:</span>
                    <select
                      value={redeemSteps}
                      onChange={(e) => setRedeemSteps(Number(e.target.value))}
                      aria-label="Kolik Kostiček uplatnit"
                      className="w-auto"
                    >
                      {Array.from({ length: maxSteps + 1 }, (_, i) => (
                        <option key={i} value={i}>
                          {i === 0 ? "nic" : `${i * loyalty.redeemStep} Kostiček = ${formatPrice(i * loyalty.redeemValueCzk)}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </fieldset>

        <div>
          <label className="label mb-1 block text-[11px] text-muted" htmlFor="note">
            Poznámka
          </label>
          <textarea id="note" name="note" rows={3} placeholder="Kdy vám můžeme zavolat, jak se k vám dostaneme…" />
        </div>
      </div>

      <aside className="h-fit rounded-[var(--radius-card)] border border-line bg-paper p-5 lg:sticky lg:top-4">
        <h2 className="text-[20px]">Objednávka</h2>
        <ul className="mt-4 divide-y divide-line text-sm">
          {cart.items.map(({ product, qty }) => (
            <li key={product.slug} className="flex justify-between gap-3 py-2">
              <span>
                {qty} × {productName(product)}
              </span>
              <span className="shrink-0">{formatPrice(qty * product.priceCzk)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-line pt-4">
          <div className="flex justify-between">
            <dt className="text-muted">Zboží</dt>
            <dd>{formatPrice(cart.subtotalCzk)}</dd>
          </div>
          {discountCzk > 0 && (
            <div className="flex justify-between text-brick-text">
              <dt>Sleva {coupon?.ok ? coupon.code : ""}</dt>
              <dd>−{formatPrice(discountCzk)}</dd>
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
          <div className="flex justify-between font-display text-[19px] font-semibold">
            <dt>Celkem</dt>
            <dd>{formatPrice(totalCzk)}</dd>
          </div>
        </dl>
        {pointsEarned > 0 && <p className="mt-2 text-xs text-muted">Za tuto objednávku získáte {pointsEarned} Kostiček.</p>}

        {belowMin && (
          <p className="mt-4 rounded-[var(--radius-control)] bg-cream p-3 text-sm text-brick-text">
            Pro tento způsob dodání je minimální objednávka {formatPrice(method.minOrderCzk)}.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-[var(--radius-control)] bg-cream p-3 text-sm text-brick-text">
            {error}
          </p>
        )}

        <div className="mt-6">
          <Button type="submit" className="w-full" disabled={pending || belowMin}>
            {pending ? "Odesílám…" : "Objednat"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted">
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

function RadioCard({
  name,
  checked,
  onChange,
  title,
  description,
  price,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
  price?: number;
}) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-[var(--radius-card)] border bg-paper p-3 text-sm ${
        checked ? "border-green ring-1 ring-green" : "border-line hover:border-green"
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-0.5 h-4 w-4 min-h-0 accent-green" />
      <span className="flex-1">
        <span className="flex justify-between gap-3 font-semibold">
          <span>{title}</span>
          {price !== undefined && <span>{price === 0 ? "zdarma" : formatPrice(price)}</span>}
        </span>
        <span className="mt-0.5 block text-xs text-muted">{description}</span>
      </span>
    </label>
  );
}

function Field({
  label,
  name,
  className = "",
  ...rest
}: { label: string; name: string; className?: string } & React.ComponentProps<"input">) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label mb-1 block text-[11px] text-muted">
        {label}
      </label>
      <input id={name} name={name} {...rest} />
    </div>
  );
}
