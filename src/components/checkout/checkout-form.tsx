"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { submitOrder, type CheckoutInput } from "@/app/(shop)/pokladna/actions";
import { useCart } from "@/components/cart/cart-context";
import { Button, ButtonLink } from "@/components/ui/button";
import { productName } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { DAY_NAMES } from "@/lib/settings";
import { shippingPrice, type PaymentId, type PaymentMethod, type ShippingId, type ShippingMethod } from "@/lib/shipping";

type Props = {
  shipping: ShippingMethod[];
  payment: PaymentMethod[];
  deliveryDays: string[];
  deliveryWindow: string;
};

const dateFmt = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric" });

export function CheckoutForm({ shipping: SHIPPING, payment: PAYMENT, deliveryDays, deliveryWindow }: Props) {
  const cart = useCart();
  const [shipping, setShipping] = useState<ShippingId>(SHIPPING[0]?.id ?? "odber");
  const [payment, setPayment] = useState<PaymentId>(PAYMENT.find((p) => p.id === "hotove")?.id ?? PAYMENT[0]?.id ?? "prevod");
  const [deliveryDate, setDeliveryDate] = useState<string>(deliveryDays[0] ?? "");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <div className="max-w-xl rounded-[var(--radius-card)] border border-line bg-paper p-8">
        <p className="label text-brick-text">Hotovo</p>
        <h2 className="mt-1">Objednávka {done} je u nás</h2>
        <p className="mt-4 text-muted">
          Potvrzení pošleme e-mailem. Kdyby něco nesedělo, zavoláme. Děkujeme.
        </p>
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
        setDone(res.orderNumber);
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
            <Field label="Jméno a příjmení" name="name" autoComplete="name" required />
            <Field label="Telefon" name="phone" type="tel" autoComplete="tel" required />
            <Field label="E-mail" name="email" type="email" autoComplete="email" required className="sm:col-span-2" />
          </div>
        </fieldset>

        {needsAddress && (
          <fieldset>
            <legend className="mb-3 text-[20px] font-display font-semibold">Adresa doručení</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Ulice a číslo" name="street" autoComplete="street-address" required className="sm:col-span-2" />
              <Field label="Město" name="city" autoComplete="address-level2" required />
              <Field label="PSČ" name="zip" autoComplete="postal-code" required />
            </div>
          </fieldset>
        )}

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
          <div className="flex justify-between">
            <dt className="text-muted">Doprava</dt>
            <dd>{shippingCzk === 0 ? "zdarma" : formatPrice(shippingCzk)}</dd>
          </div>
          <div className="flex justify-between font-display text-[19px] font-semibold">
            <dt>Celkem</dt>
            <dd>{formatPrice(cart.subtotalCzk + shippingCzk)}</dd>
          </div>
        </dl>

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
