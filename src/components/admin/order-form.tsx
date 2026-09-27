"use client";

import { Plus, Search, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createAdminOrder, findCustomers, type AdminCustomer, type AdminOrderInput } from "@/app/admin/(app)/objednavky/nova/actions";
import { previewCoupon, type CouponPreview } from "@/app/(shop)/pokladna/actions";
import { Button } from "@/components/ui/button";
import { formatQty } from "@/lib/admin";
import type { ProductUnit } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import type { Settings } from "@/lib/settings";
import { shippingPrice, type ShippingId, type ShippingMethod } from "@/lib/shipping";

export type OrderFormProduct = { slug: string; name: string; price_czk: number; unit: ProductUnit; in_stock: boolean; stock_qty: number | null; is_published: boolean };

type Props = {
  products: OrderFormProduct[];
  shipping: ShippingMethod[];
  deliveryDays: string[];
  loyalty: Settings["loyalty"];
  manager: boolean;
  prevodEnabled: boolean;
};

type Line = { slug: string; qty: number };
const dateFmt = new Intl.DateTimeFormat("cs-CZ", { weekday: "short", day: "numeric", month: "numeric" });
const EMPTY = { name: "", phone: "", email: "", street: "", city: "", zip: "" };

/** Objednávka za zákazníka (telefonická). Ceny počítá databáze, tady je jen náhled. */
export function OrderForm({ products, shipping: SHIPPING, deliveryDays, loyalty, manager, prevodEnabled }: Props) {
  const router = useRouter();
  const [customer, setCustomer] = useState<AdminCustomer | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [lines, setLines] = useState<Line[]>([]);
  const [pick, setPick] = useState("");
  const [shipping, setShipping] = useState<ShippingId>(SHIPPING[0]?.id ?? "odber");
  const [payment, setPayment] = useState<"hotove" | "prevod">("hotove");
  const [paid, setPaid] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState(deliveryDays[0] ?? "");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponPreview | null>(null);
  const [pointsRedeem, setPointsRedeem] = useState(0);
  const [discount, setDiscount] = useState({ czk: "", pct: "", note: "" });
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const bySlug = useMemo(() => new Map(products.map((p) => [p.slug, p])), [products]);
  const subtotal = lines.reduce((n, l) => n + Math.round(l.qty * (bySlug.get(l.slug)?.price_czk ?? 0)), 0);
  const method = SHIPPING.find((s) => s.id === shipping) ?? SHIPPING[0];
  const shipCzk = method ? shippingPrice(method, subtotal) : 0;
  const couponCzk = coupon?.ok ? Math.min(coupon.discountCzk, subtotal) : 0;
  const manualCzk = Math.min(Math.max(0, (Number(discount.czk) || 0) + Math.round(((subtotal - couponCzk) * (Number(discount.pct) || 0)) / 100)), subtotal - couponCzk);
  const pointsCzk = Math.min((pointsRedeem / loyalty.redeemStep) * loyalty.redeemValueCzk, subtotal - couponCzk - manualCzk);
  const total = subtotal - couponCzk - manualCzk - pointsCzk + shipCzk;
  const maxSteps = customer ? Math.floor(customer.points / loyalty.redeemStep) : 0;
  const needsAddress = shipping !== "odber";
  const available = products.filter((p) => p.in_stock && !lines.some((l) => l.slug === p.slug));

  function pickCustomer(c: AdminCustomer) {
    setCustomer(c);
    setForm({ name: c.name, phone: c.phone, email: c.email ?? "", street: c.street, city: c.city, zip: c.zip });
    setPointsRedeem(0);
  }
  function addLine(slug: string) {
    const p = bySlug.get(slug);
    if (!p) return;
    setLines([...lines, { slug, qty: p.unit === "kg" ? 0.5 : 1 }]);
    setPick("");
  }
  function setQty(slug: string, qty: number) {
    setLines(lines.map((l) => (l.slug === slug ? { ...l, qty } : l)));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const input: AdminOrderInput = {
      customerId: customer?.id ?? null,
      customer: form,
      items: lines,
      shipping,
      payment,
      deliveryDate: shipping === "rozvoz" ? deliveryDate : undefined,
      paid,
      couponCode: coupon?.ok ? coupon.code : "",
      pointsRedeem,
      discountCzk: Number(discount.czk) || 0,
      discountPct: Number(discount.pct) || 0,
      discountNote: discount.note,
      note,
      notifyCustomer: notify,
    };
    startTransition(async () => {
      const res = await createAdminOrder(input);
      if (!res.ok) return setError(res.error);
      router.push(`/admin/objednavky/${res.id}`);
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        {/* Zákazník */}
        <section className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[18px]">Zákazník</h2>
            {customer ? (
              <button type="button" onClick={() => { setCustomer(null); setForm(EMPTY); setPointsRedeem(0); }} className="inline-flex items-center gap-1 text-sm text-green underline">
                <X strokeWidth={1.75} className="h-4 w-4" /> jiný zákazník
              </button>
            ) : (
              <CustomerSearch onPick={pickCustomer} />
            )}
          </div>
          {customer && (
            <p className="mt-1 text-sm text-muted">
              Stávající zákazník · {customer.points} Kostiček{customer.card_code ? ` · karta ${customer.card_code}` : ""}
            </p>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Jméno a příjmení" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required autoComplete="off" />
            <Field label="Telefon" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} type="tel" autoComplete="off" />
            <Field label="E-mail (nepovinný, bez něj se neposílá potvrzení)" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" className="sm:col-span-2" autoComplete="off" />
            {needsAddress && (
              <>
                <Field label="Ulice a číslo" value={form.street} onChange={(v) => setForm({ ...form, street: v })} className="sm:col-span-2" required />
                <Field label="Město" value={form.city} onChange={(v) => setForm({ ...form, city: v })} required />
                <Field label="PSČ" value={form.zip} onChange={(v) => setForm({ ...form, zip: v })} required />
              </>
            )}
          </div>
        </section>

        {/* Položky */}
        <section className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <h2 className="text-[18px]">Zboží</h2>
          {lines.length > 0 && (
            <table className="mt-3 w-full text-sm">
              <tbody>
                {lines.map((l) => {
                  const p = bySlug.get(l.slug)!;
                  return (
                    <tr key={l.slug} className="border-b border-line">
                      <td className="py-2 pr-2">
                        {p.name}
                        {!p.is_published && <span className="ml-2 label text-[10px] text-muted">nezveřejněno</span>}
                        <span className="block text-xs text-muted">
                          {formatPrice(p.price_czk)}
                          {p.unit === "kg" ? "/kg" : ""}
                          {p.stock_qty !== null ? ` · skladem ${formatQty(p.stock_qty, p.unit)}` : ""}
                        </span>
                      </td>
                      <td className="w-28 py-2">
                        <input
                          type="number"
                          min={p.unit === "kg" ? 0.05 : 1}
                          step={p.unit === "kg" ? 0.05 : 1}
                          value={l.qty}
                          onChange={(e) => setQty(l.slug, Number(e.target.value))}
                          aria-label={`Množství ${p.name}`}
                          className="min-h-9 py-1"
                        />
                      </td>
                      <td className="w-10 py-2 text-xs text-muted">{p.unit}</td>
                      <td className="w-24 py-2 text-right font-semibold">{formatPrice(Math.round(l.qty * p.price_czk))}</td>
                      <td className="w-9 py-2 text-right">
                        <button type="button" onClick={() => setLines(lines.filter((x) => x.slug !== l.slug))} aria-label={`Odebrat ${p.name}`} className="text-muted hover:text-brick-text">
                          <Trash2 strokeWidth={1.75} className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <div className="mt-3 flex gap-2">
            <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Přidat produkt" className="flex-1">
              <option value="">Přidat produkt…</option>
              {available.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} · {formatPrice(p.price_czk)}
                  {p.unit === "kg" ? "/kg" : ""}
                  {p.is_published ? "" : " (nezveřejněno)"}
                </option>
              ))}
            </select>
            <Button type="button" variant="secondary" onClick={() => pick && addLine(pick)} disabled={!pick} aria-label="Přidat">
              <Plus strokeWidth={1.75} className="h-4 w-4" /> Přidat
            </Button>
          </div>
        </section>

        {/* Dodání a platba */}
        <section className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <h2 className="text-[18px]">Dodání a platba</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Dodání</span>
              <select value={shipping} onChange={(e) => { const id = e.target.value as ShippingId; setShipping(id); if (id === "prepravce" && payment === "hotove") setPayment("prevod"); }}>
                {SHIPPING.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.priceCzk ? formatPrice(s.priceCzk) : "zdarma"}
                  </option>
                ))}
              </select>
            </label>
            {shipping === "rozvoz" && (
              <label className="block">
                <span className="label mb-1 block text-[11px] text-muted">Den rozvozu</span>
                <select value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)}>
                  {deliveryDays.map((d) => (
                    <option key={d} value={d}>
                      {dateFmt.format(new Date(d + "T12:00:00"))}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className="label mb-1 block text-[11px] text-muted">Platba</span>
              <select value={payment} onChange={(e) => setPayment(e.target.value as "hotove" | "prevod")}>
                <option value="hotove" disabled={shipping === "prepravce"}>
                  Na místě (hotově nebo kartou)
                </option>
                {prevodEnabled && <option value="prevod">Převodem (údaje pošleme e-mailem)</option>}
              </select>
            </label>
            <label className="flex items-center gap-2 self-end text-sm">
              <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="h-4 min-h-0 w-4 accent-green" />
              Už zaplaceno (u pultu, převodem předem)
            </label>
          </div>
          <label className="mt-3 block">
            <span className="label mb-1 block text-[11px] text-muted">Poznámka k objednávce</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="např. zavolat před rozvozem" />
          </label>
        </section>
      </div>

      {/* Souhrn */}
      <aside className="h-fit space-y-3 rounded-[var(--radius-card)] border border-line bg-paper p-4 lg:sticky lg:top-4">
        <h2 className="text-[18px]">Souhrn</h2>
        <div className="flex gap-2">
          <input value={couponInput} onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCoupon(null); }} placeholder="Slevový kód" aria-label="Slevový kód" className="uppercase" />
          <Button type="button" variant="secondary" disabled={!couponInput.trim()} onClick={async () => setCoupon(await previewCoupon(couponInput, subtotal))}>
            Použít
          </Button>
        </div>
        {coupon && <p className={`text-xs ${coupon.ok ? "text-green" : "text-brick-text"}`}>{coupon.ok ? `${coupon.label}: −${formatPrice(couponCzk)}` : coupon.error}</p>}
        {loyalty.enabled && customer && maxSteps > 0 && (
          <label className="block">
            <span className="label mb-1 block text-[11px] text-muted">Uplatnit Kostičky ({customer.points})</span>
            <select value={pointsRedeem} onChange={(e) => setPointsRedeem(Number(e.target.value))}>
              <option value={0}>neuplatnit</option>
              {Array.from({ length: maxSteps }, (_, i) => (i + 1) * loyalty.redeemStep).map((p) => (
                <option key={p} value={p}>
                  {p} Kostiček = −{formatPrice((p / loyalty.redeemStep) * loyalty.redeemValueCzk)}
                </option>
              ))}
            </select>
          </label>
        )}
        {manager && (
          <details className="text-sm">
            <summary className="cursor-pointer text-green">Ruční sleva (jen správce)</summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input type="number" min={0} value={discount.czk} onChange={(e) => setDiscount({ ...discount, czk: e.target.value })} placeholder="Kč" aria-label="Sleva v Kč" />
              <input type="number" min={0} max={100} value={discount.pct} onChange={(e) => setDiscount({ ...discount, pct: e.target.value })} placeholder="%" aria-label="Sleva v procentech" />
              <input value={discount.note} onChange={(e) => setDiscount({ ...discount, note: e.target.value })} placeholder="Důvod" aria-label="Důvod slevy" className="col-span-2" />
            </div>
          </details>
        )}
        <dl className="space-y-1 border-t border-line pt-3 text-sm">
          <Row k="Zboží" v={formatPrice(subtotal)} />
          {couponCzk > 0 && <Row k="Slevový kód" v={`−${formatPrice(couponCzk)}`} accent />}
          {manualCzk > 0 && <Row k="Ruční sleva" v={`−${formatPrice(manualCzk)}`} accent />}
          {pointsCzk > 0 && <Row k="Kostičky" v={`−${formatPrice(pointsCzk)}`} accent />}
          <Row k="Doprava" v={shipCzk === 0 ? "zdarma" : formatPrice(shipCzk)} />
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
            <dt>Celkem</dt>
            <dd className="font-display text-[22px] text-green">{formatPrice(Math.max(0, total))}</dd>
          </div>
        </dl>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} disabled={!form.email.includes("@")} className="h-4 min-h-0 w-4 accent-green" />
          Poslat zákazníkovi potvrzení e-mailem
        </label>
        {error && (
          <p role="alert" className="text-sm text-brick-text">
            {error}
          </p>
        )}
        <Button type="submit" variant="action" disabled={pending || lines.length === 0} className="w-full">
          {pending ? "Ukládám…" : "Založit objednávku"}
        </Button>
        <p className="text-xs text-muted">Konečnou cenu i slevy spočítá databáze stejně jako u objednávky z webu. Objednávka vznikne ve stavu Nová.</p>
      </aside>
    </form>
  );
}

function CustomerSearch({ onPick }: { onPick: (c: AdminCustomer) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<AdminCustomer[]>([]);
  useEffect(() => {
    const short = q.trim().length < 2;
    const t = setTimeout(() => (short ? setResults([]) : findCustomers(q).then(setResults)), short ? 0 : 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="relative w-full sm:w-72">
      <Search strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Najít stávajícího: jméno, telefon, karta" aria-label="Hledat zákazníka" className="min-h-9 pl-9 text-sm" />
      {results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-[var(--radius-card)] border border-line bg-white">
          {results.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => { onPick(c); setQ(""); setResults([]); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-cream">
                <span className="font-semibold">{c.name}</span>
                <span className="block text-xs text-muted">
                  {c.phone}
                  {c.email ? ` · ${c.email}` : ""} · {c.points} Kostiček
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, value, onChange, className = "", ...rest }: { label: string; value: string; onChange: (v: string) => void; className?: string } & Omit<React.ComponentProps<"input">, "onChange" | "value">) {
  return (
    <label className={`block ${className}`}>
      <span className="label mb-1 block text-[11px] text-muted">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </label>
  );
}

function Row({ k, v, accent = false }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${accent ? "text-brick-text" : ""}`}>
      <dt className={accent ? "" : "text-muted"}>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
