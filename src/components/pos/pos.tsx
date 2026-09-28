"use client";

import { Banknote, CreditCard, Minus, Pause, Plus, QrCode, Search, Trash2, User, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/app/admin/login/actions";
import QRCode from "qrcode";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  posAssignCard,
  posCancelSale,
  posCashMove,
  posCheckout,
  posCloseShift,
  posCreateCustomer,
  posCustomerByCard,
  posFindCustomers,
  posOpenShift,
  posPickupOrders,
  posRecentSales,
  posSaleItems,
  posSettleOrder,
  posShiftSummary,
  type CloseResult,
} from "@/app/admin/kasa/actions";
import { Button } from "@/components/ui/button";
import { formatDate, PAYMENT_LABEL } from "@/lib/admin";
import { normalizeCardCode } from "@/lib/cards";
import { LINE_INFO, LINES, productName, type LineSlug } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { POS_PAYMENT_LABEL, spdString, type CartLine, type PickupOrder, type PosCustomer, type PosPayment, type PosProduct, type PosSaleItemRow, type PosSaleRow } from "@/lib/pos";
import { petSummary } from "@/lib/club";
import { MEAT_LABEL } from "@/lib/barf";
import type { Settings } from "@/lib/settings";

type Tab = "prodej" | "vydej" | "odlozene" | "dnes" | "uzaverka";
type Shift = Awaited<ReturnType<typeof posShiftSummary>>;
type Parked = { id: string; name: string; at: string; lines: { productId: string; qty: number }[]; customer: PosCustomer | null };

/** Barva řady: tečka na dlaždici a u kategorie (dlaždice jsou světlé, aby se četla cena a sklad). */
const LINE_DOT: Record<LineSlug, string> = {
  barf: "bg-green",
  kosti: "bg-brick",
  navic: "bg-ochre",
  mlsky: "bg-olive",
  granule: "bg-muted",
};
const PARKED_KEY = "dokosti-kasa-odlozene";
const fmtQty = (qty: number, unit: "ks" | "kg") => (unit === "kg" ? `${qty.toLocaleString("cs-CZ", { maximumFractionDigits: 3 })} kg` : `${qty} ks`);

/**
 * Kasa: vlevo dlaždice produktů, vpravo účtenka. Čtečka píše do hledání a potvrdí Enterem:
 * EAN přidá produkt, kód zákaznické karty připojí zákazníka (nebo nabídne přiřazení).
 */
export function Pos({
  products,
  manager,
  userId,
  userEmail,
  loyalty,
  pos,
  shopName,
  iban,
  initialShift,
  initialPickup,
}: {
  products: PosProduct[];
  manager: boolean;
  userId: string;
  userEmail: string;
  loyalty: Settings["loyalty"];
  pos: Settings["pos"];
  shopName: string;
  iban: string | null;
  initialShift: Shift;
  initialPickup: PickupOrder[];
}) {
  const [tab, setTab] = useState<Tab>("prodej");
  const [shift, setShift] = useState<Shift>(initialShift);
  const [pickup, setPickup] = useState<PickupOrder[]>(initialPickup);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<PosCustomer | null>(null);
  const [discount, setDiscount] = useState<{ czk: number; pct: number; note: string }>({ czk: 0, pct: 0, note: "" });
  const [coupon, setCoupon] = useState("");
  const [pointsRedeem, setPointsRedeem] = useState(0);
  const [paying, setPaying] = useState(false);
  const [modal, setModal] = useState<null | { kind: "kg"; product: PosProduct } | { kind: "customer" } | { kind: "card"; code: string } | { kind: "discount" } | { kind: "done"; id: string; number: string; total: number; change: number | null; points: number } | { kind: "settle"; order: PickupOrder } | { kind: "storno"; sale: PosSaleRow }>(null);
  const [parked, setParked] = useState<Parked[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Načtení odložených účtů až po hydrataci (localStorage není na serveru).
    const t = setTimeout(() => {
      try {
        setParked(JSON.parse(localStorage.getItem(PARKED_KEY) || "[]"));
      } catch {
        /* bez localStorage */
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const saveParked = (list: Parked[]) => {
    setParked(list);
    try {
      localStorage.setItem(PARKED_KEY, JSON.stringify(list));
    } catch {
      /* ignore */
    }
  };
  const say = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 2500);
  };

  /* ---------- účtenka ---------- */
  const subtotal = lines.reduce((s, l) => s + Math.round(l.qty * l.product.price_czk), 0);
  const manualDiscount = Math.min(subtotal, Math.max(discount.czk, Math.round((subtotal * discount.pct) / 100)));
  const pointsCzk = loyalty.enabled && customer ? Math.min((pointsRedeem / loyalty.redeemStep) * loyalty.redeemValueCzk, subtotal - manualDiscount) : 0;
  const total = Math.max(0, subtotal - manualDiscount - pointsCzk);
  const maxSteps = customer ? Math.floor(customer.points / loyalty.redeemStep) : 0;

  function addProduct(p: PosProduct, qty = 1) {
    if (p.unit === "kg" && qty === 1) {
      setModal({ kind: "kg", product: p });
      return;
    }
    setLines((ls) => {
      const i = ls.findIndex((l) => l.product.id === p.id);
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, qty: l.qty + qty } : l));
      return [...ls, { product: p, qty }];
    });
  }
  const setQty = (id: string, qty: number) => setLines((ls) => (qty <= 0 ? ls.filter((l) => l.product.id !== id) : ls.map((l) => (l.product.id === id ? { ...l, qty } : l))));
  function clearSale() {
    setLines([]);
    setCustomer(null);
    setDiscount({ czk: 0, pct: 0, note: "" });
    setCoupon("");
    setPointsRedeem(0);
    setModal(null);
    setPaying(false);
    searchRef.current?.focus();
  }

  /* ---------- hledání a čtečka ---------- */
  const [query, setQuery] = useState("");
  const [line, setLine] = useState<LineSlug | "vse">("vse");
  const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const visible = useMemo(() => {
    const q = fold(query.trim());
    return products.filter((p) => (line === "vse" || p.line === line) && (!q || fold(productName(p)).includes(q) || (p.ean ?? "").includes(q)));
  }, [products, query, line]);

  function onScan(code: string) {
    const c = code.trim();
    if (!c) return;
    const byEan = products.find((p) => p.ean && p.ean === c);
    if (byEan) {
      addProduct(byEan);
      setQuery("");
      say(`Přidáno: ${productName(byEan)}`);
      return;
    }
    if (visible.length === 1 && fold(productName(visible[0])).includes(fold(c))) {
      addProduct(visible[0]);
      setQuery("");
      return;
    }
    // neznámý kód: zkusit zákaznickou kartu (čtečka z QR pošle celou adresu dokosti.cz/k/KÓD)
    const card = normalizeCardCode(c);
    if (/^[A-Z0-9-]{4,32}$/.test(card)) {
      startTransition(async () => {
        const found = await posCustomerByCard(card);
        if (found) {
          setCustomer(found);
          setPointsRedeem(0);
          setQuery("");
          say(`Zákazník: ${found.name}`);
        } else setModal({ kind: "card", code: card });
      });
    }
  }

  /* ---------- platba ---------- */
  function pay(payment: PosPayment, cashReceived?: number) {
    startTransition(async () => {
      const res = await posCheckout({
        customerId: customer?.id ?? null,
        payment,
        cashReceivedCzk: cashReceived,
        discountCzk: discount.czk,
        discountPct: discount.pct,
        discountNote: discount.note,
        couponCode: coupon || undefined,
        pointsRedeem,
        items: lines.map((l) => ({ productId: l.product.id, qty: l.qty })),
      });
      if (!res.ok) {
        say(res.error);
        return;
      }
      setModal({ kind: "done", id: res.id, number: res.number, total: res.totalCzk, change: res.changeCzk, points: res.pointsEarned });
      if (pos.autoPrint) window.open(`/admin/kasa/uctenka/${res.id}?tisk=1`, "_blank", "noopener");
      posShiftSummary().then(setShift);
      router.refresh(); // aktuální stav skladu na dlaždicích
    });
  }

  function park() {
    if (!lines.length) return;
    const name = customer?.name || lines[0].product.variant;
    saveParked([{ id: Math.random().toString(36).slice(2, 8), name, at: new Date().toISOString(), lines: lines.map((l) => ({ productId: l.product.id, qty: l.qty })), customer }, ...parked].slice(0, 12));
    clearSale();
    say("Účet odložen.");
  }
  function resume(p: Parked) {
    setLines(p.lines.flatMap((l) => (products.find((x) => x.id === l.productId) ? [{ product: products.find((x) => x.id === l.productId)!, qty: l.qty }] : [])));
    setCustomer(p.customer);
    saveParked(parked.filter((x) => x.id !== p.id));
    setTab("prodej");
  }

  const noShift = !shift.shift;

  return (
    <div className="flex h-dvh flex-col">
      {/* Horní lišta */}
      <header className="flex flex-wrap items-center gap-2 bg-green px-3 py-2 text-cream">
        <Link href="/admin" className="mr-2 font-display text-[20px] font-semibold text-cream">
          DoKosti
        </Link>
        <nav className="flex gap-1 overflow-x-auto" aria-label="Kasa">
          {(
            [
              ["prodej", "Prodej", 0],
              ["vydej", "K výdeji", pickup.length],
              ["odlozene", "Odložené", parked.length],
              ["dnes", "Dnes", 0],
            ] as [Tab, string, number][]
          ).map(([id, label, n]) => (
            <button key={id} type="button" onClick={() => { setTab(id); setPaying(false); }} aria-pressed={tab === id} className={`label inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-[var(--radius-control)] px-3 text-[11px] ${tab === id ? "bg-cream text-green" : "text-cream hover:bg-green-hover"}`}>
              {label}
              {n > 0 && <span className={`rounded-full px-1.5 text-[10px] ${tab === id ? "bg-green text-cream" : "bg-brick text-cream"}`}>{n}</span>}
            </button>
          ))}
        </nav>
        <span className="ml-auto hidden truncate text-xs opacity-90 sm:inline">
          {noShift ? "Směna zavřená" : `Směna od ${new Date(shift.shift!.opened_at).toLocaleTimeString("cs-CZ", { hour: "numeric", minute: "2-digit" })}`} · {userEmail.split("@")[0]}
        </span>
        <button type="button" onClick={() => { setTab("uzaverka"); setPaying(false); }} aria-pressed={tab === "uzaverka"} className={`label min-h-9 rounded-[var(--radius-control)] border border-cream/70 px-3 text-[11px] ${tab === "uzaverka" ? "bg-cream text-green" : noShift ? "border-brick bg-brick text-cream" : "text-cream hover:bg-green-hover"}`}>
          {noShift ? "Otevřít směnu" : "Uzávěrka"}
        </button>
        <form action={logout}>
          <button type="submit" className="label min-h-9 rounded-[var(--radius-control)] px-2 text-[11px] text-cream/80 hover:bg-green-hover">
            Odhlásit
          </button>
        </form>
        {toast && (
          <span role="status" className="rounded-[var(--radius-control)] bg-cream px-3 py-1 text-sm text-green">
            {toast}
          </span>
        )}
      </header>

      {tab === "prodej" && (
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[380px_1fr] lg:grid-cols-[440px_1fr]">
          {/* Účtenka: vlevo, u obsluhy */}
          <aside className="flex min-h-0 flex-col border-r border-line bg-paper" aria-label="Účtenka">
            <div className="flex items-start gap-2 border-b border-line p-3">
              <div className="min-w-0 flex-1">
                <p className="label text-[11px] text-muted">Zákazník</p>
                {customer ? (
                  <>
                    <p className="truncate font-semibold">
                      {customer.name}
                      {customer.card_code && <span className="font-normal text-muted"> · karta {customer.card_code}</span>}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {customer.pets && customer.pets.length > 0 && customer.pets.map((p) => `${p.name} (${petSummary(p, MEAT_LABEL)})`).join(" · ")}
                      {customer.pets && customer.pets.length > 0 && loyalty.enabled && " · "}
                      {loyalty.enabled && `${customer.points} Kostiček`}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted">Načtěte kartu, nebo vyberte. Prodej jde i bez zákazníka.</p>
                )}
              </div>
              {customer ? (
                <Button type="button" variant="secondary" onClick={() => { setCustomer(null); setPointsRedeem(0); }} className="min-h-9 px-3 text-[11px]">
                  Změnit
                </Button>
              ) : (
                <Button type="button" variant="secondary" onClick={() => setModal({ kind: "customer" })} className="min-h-9 px-3 text-[11px]">
                  <User strokeWidth={1.75} className="h-4 w-4" /> Vybrat
                </Button>
              )}
            </div>

            {paying ? (
              <div className="flex-1 overflow-y-auto p-3 text-sm">
                <p className="label text-[11px] text-muted">Účtenka</p>
                <ul className="mt-2 space-y-1.5">
                  {lines.map((l) => (
                    <li key={l.product.id} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">
                        {fmtQty(l.qty, l.product.unit)} × {productName(l.product)}
                      </span>
                      <span className="tabular-nums">{formatPrice(Math.round(l.qty * l.product.price_czk))}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <ul className="flex-1 divide-y divide-line overflow-y-auto">
                {lines.length === 0 && <li className="p-4 text-sm text-muted">Klepněte na zboží vpravo, nebo načtěte kód čtečkou.</li>}
                {lines.map((l) => (
                  <li key={l.product.id} className="flex items-center gap-2 px-3 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {productName(l.product)}
                        {l.product.unit === "kg" && <span className="label ml-1 text-[9px] text-brick-text">na váhu</span>}
                      </p>
                      <p className="text-xs text-muted">
                        {fmtQty(l.qty, l.product.unit)} × {formatPrice(l.product.price_czk)}
                        {l.product.unit === "kg" ? "/kg" : ""}
                      </p>
                    </div>
                    {l.product.unit === "ks" ? (
                      <span className="flex items-center gap-1">
                        <QtyBtn label="Ubrat" onClick={() => setQty(l.product.id, l.qty - 1)}>
                          <Minus strokeWidth={1.75} className="h-4 w-4" />
                        </QtyBtn>
                        <span className="w-6 text-center font-semibold">{l.qty}</span>
                        <QtyBtn label="Přidat" onClick={() => setQty(l.product.id, l.qty + 1)}>
                          <Plus strokeWidth={1.75} className="h-4 w-4" />
                        </QtyBtn>
                      </span>
                    ) : (
                      <Button type="button" variant="secondary" onClick={() => setModal({ kind: "kg", product: l.product })} className="min-h-8 px-2 text-[10px]">
                        Upravit váhu
                      </Button>
                    )}
                    <span className="w-[76px] text-right font-semibold tabular-nums">{formatPrice(Math.round(l.qty * l.product.price_czk))}</span>
                    <QtyBtn label="Odebrat" onClick={() => setQty(l.product.id, 0)}>
                      <Trash2 strokeWidth={1.75} className="h-4 w-4" />
                    </QtyBtn>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-line bg-cream p-3 text-sm">
              <div className="flex justify-between">
                <span>Zboží</span>
                <span className="tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              {manualDiscount > 0 && (
                <div className="flex justify-between text-brick-text">
                  <span>Sleva{discount.note ? ` · ${discount.note}` : ""}</span>
                  <span className="tabular-nums">−{formatPrice(manualDiscount)}</span>
                </div>
              )}
              {pointsCzk > 0 && (
                <div className="flex justify-between text-brick-text">
                  <span>Kostičky ({pointsRedeem})</span>
                  <span className="tabular-nums">−{formatPrice(pointsCzk)}</span>
                </div>
              )}
              {!paying && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Slevový kód" aria-label="Slevový kód" className="min-h-9 w-32 py-1 text-xs uppercase" />
                  {loyalty.enabled && customer && maxSteps > 0 && (
                    <select value={pointsRedeem} onChange={(e) => setPointsRedeem(Number(e.target.value))} aria-label="Uplatnit Kostičky" className="min-h-9 w-auto py-1 text-xs">
                      {Array.from({ length: maxSteps + 1 }, (_, i) => (
                        <option key={i} value={i * loyalty.redeemStep}>
                          {i === 0 ? "Kostičky: neuplatnit" : `${i * loyalty.redeemStep} Kostiček = −${formatPrice(i * loyalty.redeemValueCzk)}`}
                        </option>
                      ))}
                    </select>
                  )}
                  <span className="ml-auto flex gap-1">
                    {manager && (
                      <Button type="button" variant="secondary" onClick={() => setModal({ kind: "discount" })} className="min-h-9 px-2.5 text-[10px]">
                        {manualDiscount > 0 ? "Upravit slevu" : "Sleva"}
                      </Button>
                    )}
                    <Button type="button" variant="secondary" onClick={park} disabled={!lines.length} className="min-h-9 px-2.5 text-[10px]">
                      <Pause strokeWidth={1.75} className="h-3.5 w-3.5" /> Odložit
                    </Button>
                    <Button type="button" variant="secondary" onClick={clearSale} disabled={!lines.length && !customer} className="min-h-9 border-line px-2.5 text-[10px] text-brick-text">
                      <Trash2 strokeWidth={1.75} className="h-3.5 w-3.5" /> Vymazat
                    </Button>
                  </span>
                </div>
              )}
              <div className="mt-3 flex items-baseline justify-between">
                <span className="label text-[11px] text-muted">{paying ? "K zaplacení" : "Celkem"}</span>
                <span className="font-display text-[34px] font-semibold text-green">{formatPrice(total)}</span>
              </div>
              {paying ? (
                <Button type="button" variant="secondary" onClick={() => setPaying(false)} className="mt-2 min-h-12 w-full text-[13px]">
                  Zpět k prodeji
                </Button>
              ) : (
                <Button type="button" variant="action" onClick={() => (noShift ? setTab("uzaverka") : setPaying(true))} disabled={!lines.length || pending} className="mt-2 min-h-14 w-full text-[14px]">
                  {noShift ? "Nejdřív otevřít směnu" : `Zaplatit ${formatPrice(total)}`}
                </Button>
              )}
            </div>
          </aside>

          {paying ? (
            <section className="flex min-h-0 flex-col overflow-y-auto p-4 md:p-6">
              <PayPanel total={total} iban={iban} shopName={shopName} pending={pending} onPay={pay} />
            </section>
          ) : (
            <section className="flex min-h-0 flex-col">
              <div className="flex flex-col gap-2 p-3">
                <div className="relative">
                  <Search strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    ref={searchRef}
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onScan(query);
                      }
                    }}
                    placeholder="Načtěte kartu nebo zboží čtečkou, nebo pište název"
                    aria-label="Hledat produkt nebo načíst kód"
                    className="min-h-11 pl-9"
                  />
                </div>
                <div className="flex gap-1.5 overflow-x-auto">
                  {(["vse", ...LINES] as (LineSlug | "vse")[]).map((l) => (
                    <button key={l} type="button" onClick={() => setLine(l)} aria-pressed={line === l} className={`label inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-[11px] ${line === l ? "border-green bg-green text-cream" : "border-line bg-paper text-green hover:border-green"}`}>
                      {l !== "vse" && <span className={`h-2.5 w-2.5 rounded-full ${line === l ? "bg-cream" : LINE_DOT[l]}`} />}
                      {l === "vse" ? "Vše" : LINE_INFO[l].name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto p-3 pt-0 lg:grid-cols-3 xl:grid-cols-4">
                {visible.map((p) => {
                  const low = p.stock_qty !== null && p.unit === "ks" && Number(p.stock_qty) > 0 && Number(p.stock_qty) <= 5;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProduct(p)}
                      disabled={!p.in_stock}
                      className={`flex min-h-[96px] flex-col justify-between rounded-[var(--radius-card)] border bg-paper p-3 text-left hover:border-green disabled:cursor-not-allowed disabled:border-dashed disabled:text-muted ${p.in_stock ? "border-line" : "border-line"}`}
                    >
                      <span className="flex items-start gap-2 text-[15px] font-semibold leading-tight">
                        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${LINE_DOT[p.line]}`} />
                        <span>
                          {productName(p)}
                          {!p.is_published && <span className="label ml-1 text-[9px] text-brick-text">jen prodejna</span>}
                          {p.unit === "kg" && <span className="label ml-1 text-[9px] text-brick-text">na váhu</span>}
                        </span>
                      </span>
                      <span className="mt-2 flex items-baseline justify-between gap-2">
                        <span className="font-display text-[19px] font-semibold">
                          {formatPrice(p.price_czk)}
                          {p.unit === "kg" && <span className="font-body text-xs font-normal text-muted">/kg</span>}
                        </span>
                        <span className={`text-xs ${!p.in_stock ? "text-brick-text" : low ? "text-brick-text" : "text-muted"}`}>{!p.in_stock ? "není skladem" : p.stock_qty !== null ? (low ? `poslední ${fmtQty(p.stock_qty, p.unit)}` : fmtQty(p.stock_qty, p.unit)) : ""}</span>
                      </span>
                    </button>
                  );
                })}
                {visible.length === 0 && <p className="col-span-full p-4 text-muted">Nic nenalezeno.</p>}
              </div>
            </section>
          )}
        </div>
      )}

      {tab === "vydej" && (
        <section className="flex-1 overflow-y-auto p-4">
          <h2 className="text-[20px]">Objednávky k osobnímu odběru</h2>
          {pickup.length === 0 ? (
            <p className="mt-2 text-muted">Nic nečeká na výdej.</p>
          ) : (
            <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {pickup.map((o) => (
                <li key={o.id} className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold">{o.customer_name}</p>
                    <span className="text-xs text-muted">{o.order_number}</span>
                  </div>
                  <p className="text-xs text-muted">
                    {formatDate(o.created_at)} · {o.paid_at ? "zaplaceno" : PAYMENT_LABEL[o.payment_method]}
                    {o.customer_phone ? ` · ${o.customer_phone}` : ""}
                  </p>
                  <ul className="mt-2 text-sm">
                    {o.order_items.map((i, idx) => (
                      <li key={idx}>
                        {Number(i.qty)} × {i.name}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-display text-[20px] font-semibold text-green">{formatPrice(o.total_czk)}</span>
                    <Button type="button" onClick={() => (noShift ? setTab("uzaverka") : setModal({ kind: "settle", order: o }))} className="min-h-10">
                      {o.payment_method === "hotove" && !o.paid_at ? "Vydat a zaplatit" : "Vydat"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "odlozene" && (
        <section className="flex-1 overflow-y-auto p-4">
          <h2 className="text-[20px]">Odložené účty</h2>
          {parked.length === 0 ? (
            <p className="mt-2 text-muted">Žádný odložený účet. Odložíte ho tlačítkem pauzy u účtenky.</p>
          ) : (
            <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {parked.map((p) => (
                <li key={p.id} className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-muted">
                    {formatDate(p.at)} · {p.lines.length} položek
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button type="button" onClick={() => resume(p)} className="min-h-10">
                      Pokračovat
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => saveParked(parked.filter((x) => x.id !== p.id))} className="min-h-10">
                      Smazat
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "dnes" && <TodayTab manager={manager} userId={userId} onStorno={(s) => setModal({ kind: "storno", sale: s })} refreshKey={modal === null ? 1 : 0} />}

      {tab === "uzaverka" && <ShiftTab shift={shift} onChange={setShift} say={say} />}

      {/* Modaly */}
      {modal?.kind === "kg" && (
        <Modal title={productName(modal.product)} onClose={() => setModal(null)}>
          <KgForm
            product={modal.product}
            initial={lines.find((l) => l.product.id === modal.product.id)?.qty}
            onSubmit={(kg) => {
              setLines((ls) => (ls.some((l) => l.product.id === modal.product.id) ? ls.map((l) => (l.product.id === modal.product.id ? { ...l, qty: kg } : l)) : [...ls, { product: modal.product, qty: kg }]));
              setModal(null);
            }}
          />
        </Modal>
      )}
      {modal?.kind === "customer" && (
        <Modal title="Zákazník" onClose={() => setModal(null)}>
          <CustomerPicker onPick={(c) => { setCustomer(c); setPointsRedeem(0); setModal(null); }} />
        </Modal>
      )}
      {modal?.kind === "card" && (
        <Modal title={`Nová karta ${modal.code}`} onClose={() => setModal(null)}>
          <CardAssign code={modal.code} onDone={(c) => { setCustomer(c); setPointsRedeem(0); setModal(null); say(`Karta přiřazena: ${c.name}`); }} />
        </Modal>
      )}
      {modal?.kind === "discount" && (
        <Modal title="Ruční sleva" onClose={() => setModal(null)}>
          <DiscountForm value={discount} onSubmit={(d) => { setDiscount(d); setModal(null); }} />
        </Modal>
      )}
      {modal?.kind === "settle" && (
        <Modal title={`Výdej ${modal.order.order_number} · ${formatPrice(modal.order.total_czk)}`} onClose={() => setModal(null)} wide>
          {modal.order.payment_method === "hotove" && !modal.order.paid_at ? (
            <PayPanel
              total={modal.order.total_czk}
              iban={iban}
              shopName={shopName}
              pending={pending}
              onPay={(payment, cash) =>
                startTransition(async () => {
                  const res = await posSettleOrder(modal.order.id, payment, cash);
                  if (!res.ok) return say(res.error);
                  setPickup(await posPickupOrders());
                  setModal({ kind: "done", id: res.id, number: res.number, total: modal.order.total_czk, change: res.changeCzk, points: 0 });
                  if (pos.autoPrint) window.open(`/admin/kasa/uctenka/${res.id}?tisk=1`, "_blank", "noopener");
                  posShiftSummary().then(setShift);
                })
              }
            />
          ) : (
            <div>
              <p className="text-sm text-muted">Objednávka je zaplacená předem{modal.order.paid_at ? "" : ` (${PAYMENT_LABEL[modal.order.payment_method]})`}. Potvrďte vydání zboží.</p>
              <Button
                type="button"
                className="mt-4 min-h-12 w-full"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const res = await posSettleOrder(modal.order.id, "prevod");
                    if (!res.ok) return say(res.error);
                    setPickup(await posPickupOrders());
                    setModal({ kind: "done", id: res.id, number: res.number, total: modal.order.total_czk, change: null, points: 0 });
                    posShiftSummary().then(setShift);
                  })
                }
              >
                Vydáno
              </Button>
            </div>
          )}
        </Modal>
      )}
      {modal?.kind === "done" && (
        <Modal title={`Hotovo · ${modal.number}`} onClose={clearSale}>
          <p className="font-display text-[34px] font-semibold text-green">{formatPrice(modal.total)}</p>
          {modal.change !== null && modal.change > 0 && (
            <p className="mt-1 text-lg">
              Vrátit <strong>{formatPrice(modal.change)}</strong>
            </p>
          )}
          {modal.points > 0 && <p className="mt-1 text-sm text-muted">Zákazníkovi přibylo {modal.points} Kostiček.</p>}
          {!pos.autoPrint && <p className="mt-3 text-sm text-muted">Chce zákazník účtenku?</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <a href={`/admin/kasa/uctenka/${modal.id}?tisk=1`} target="_blank" rel="noopener" onClick={clearSale} className="label inline-flex min-h-11 items-center rounded-[var(--radius-control)] border-2 border-green px-4 text-[12px] text-green">
              Tisk účtenky
            </a>
            <Button type="button" variant="action" onClick={clearSale} className="min-h-11">
              {pos.autoPrint ? "Nový prodej" : "Bez účtenky"}
            </Button>
          </div>
        </Modal>
      )}
      {modal?.kind === "storno" && (
        <Modal title={`Storno ${modal.sale.number}`} onClose={() => setModal(null)}>
          <StornoForm
            onSubmit={(reason) =>
              startTransition(async () => {
                const res = await posCancelSale(modal.sale.id, reason);
                if (!res.ok) return say(res.error);
                setModal(null);
                say("Účtenka stornována, sklad a Kostičky vráceny.");
                posShiftSummary().then(setShift);
                router.refresh();
              })
            }
          />
        </Modal>
      )}
    </div>
  );
}

/* ---------- podkomponenty ---------- */

function QtyBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] border border-line text-green hover:bg-cream">
      {children}
    </button>
  );
}

function Modal({ title, onClose, wide = false, children }: { title: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`w-full rounded-[var(--radius-card)] border border-line bg-paper p-5 ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[20px]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Zavřít" className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-muted hover:bg-cream">
            <X strokeWidth={1.75} className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function KgForm({ product, initial, onSubmit }: { product: PosProduct; initial?: number; onSubmit: (kg: number) => void }) {
  const [grams, setGrams] = useState(initial ? String(Math.round(initial * 1000)) : "");
  const kg = (Number(grams) || 0) / 1000;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (kg > 0) onSubmit(Math.round(kg * 1000) / 1000);
      }}
    >
      <label className="block">
        <span className="label mb-1 block text-[11px] text-muted">Navážené množství (g)</span>
        <input autoFocus type="number" inputMode="numeric" min={1} step={1} value={grams} onChange={(e) => setGrams(e.target.value)} placeholder="např. 850" className="text-[22px]" />
      </label>
      <p className="mt-2 text-sm text-muted">
        {formatPrice(product.price_czk)}/kg → <strong>{formatPrice(Math.round(kg * product.price_czk))}</strong>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {[250, 500, 1000, 1500].map((g) => (
          <button key={g} type="button" onClick={() => setGrams(String(g))} className="rounded-[var(--radius-control)] border border-line px-3 py-1 text-sm hover:border-green">
            {g} g
          </button>
        ))}
      </div>
      <Button type="submit" className="mt-4 min-h-11 w-full" disabled={kg <= 0}>
        Přidat
      </Button>
    </form>
  );
}

function CustomerPicker({ onPick }: { onPick: (c: PosCustomer) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PosCustomer[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const short = q.trim().length < 2;
    const t = setTimeout(() => (short ? setResults([]) : posFindCustomers(q).then(setResults)), short ? 0 : 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div>
      {!creating ? (
        <>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Jméno, telefon, e-mail nebo karta" aria-label="Hledat zákazníka" />
          <ul className="mt-2 max-h-64 divide-y divide-line overflow-y-auto rounded-[var(--radius-control)] border border-line">
            {results.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onPick(c)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-cream">
                  <span>
                    <strong>{c.name || "bez jména"}</strong>
                    <span className="text-muted">
                      {" "}
                      · {c.phone || c.email || ""}
                    </span>
                  </span>
                  <span className="text-xs text-muted">{c.points} K</span>
                </button>
              </li>
            ))}
            {q.trim().length >= 2 && results.length === 0 && <li className="px-3 py-2 text-sm text-muted">Nikdo nenalezen.</li>}
          </ul>
          <button type="button" onClick={() => setCreating(true)} className="mt-3 text-sm text-green underline">
            Nový zákazník
          </button>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await posCreateCustomer(form.name, form.phone, form.email);
              if (!res.ok) return setErr(res.error);
              onPick(res.customer);
            });
          }}
          className="space-y-2"
        >
          <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jméno" required aria-label="Jméno" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Telefon" type="tel" aria-label="Telefon" />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="E-mail (nepovinný)" type="email" aria-label="E-mail" />
          {err && <p className="text-sm text-brick-text">{err}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending} className="min-h-10">
              Založit
            </Button>
            <Button type="button" variant="secondary" onClick={() => setCreating(false)} className="min-h-10">
              Zpět
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function CardAssign({ code, onDone }: { code: string; onDone: (c: PosCustomer) => void }) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const assign = (customerId: string | null) =>
    startTransition(async () => {
      const res = await posAssignCard(code, customerId, form.name, form.phone, form.email);
      if (!res.ok) return setErr(res.error);
      onDone(res.customer);
    });
  return (
    <div>
      <p className="text-sm text-muted">Tento kód zatím nikomu nepatří. Komu kartu přiřadit?</p>
      <p className="mt-1 text-xs text-muted">
        S e-mailem odejde zákazníkovi „Aktivujte kartu“. Bez e-mailu si kartu aktivuje sám přes QR na kartě, nebo na tabletu:{" "}
        <a href={`/k/${encodeURIComponent(code)}?kiosk=1`} target="_blank" rel="noopener" className="text-green underline">
          otevřít aktivaci karty
        </a>
        .
      </p>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={() => setMode("existing")} aria-pressed={mode === "existing"} className={`rounded-[var(--radius-control)] border px-3 py-1 text-sm ${mode === "existing" ? "border-green bg-green text-cream" : "border-line"}`}>
          Stávající zákazník
        </button>
        <button type="button" onClick={() => setMode("new")} aria-pressed={mode === "new"} className={`rounded-[var(--radius-control)] border px-3 py-1 text-sm ${mode === "new" ? "border-green bg-green text-cream" : "border-line"}`}>
          Nový zákazník
        </button>
      </div>
      <div className="mt-3">
        {mode === "existing" ? (
          <CustomerPicker onPick={(c) => assign(c.id)} />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              assign(null);
            }}
            className="space-y-2"
          >
            <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Jméno" required aria-label="Jméno" />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Telefon" type="tel" aria-label="Telefon" />
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="E-mail (nepovinný)" type="email" aria-label="E-mail" />
            <Button type="submit" disabled={pending} className="min-h-10">
              Přiřadit kartu
            </Button>
          </form>
        )}
      </div>
      {err && <p className="mt-2 text-sm text-brick-text">{err}</p>}
    </div>
  );
}

function DiscountForm({ value, onSubmit }: { value: { czk: number; pct: number; note: string }; onSubmit: (d: { czk: number; pct: number; note: string }) => void }) {
  const [d, setD] = useState(value);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ czk: Math.max(0, Math.round(d.czk)), pct: Math.min(100, Math.max(0, d.pct)), note: d.note.trim() });
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label mb-1 block text-[11px] text-muted">Sleva v %</span>
          <input type="number" min={0} max={100} value={d.pct || ""} onChange={(e) => setD({ ...d, pct: Number(e.target.value), czk: 0 })} />
        </label>
        <label className="block">
          <span className="label mb-1 block text-[11px] text-muted">nebo v Kč</span>
          <input type="number" min={0} value={d.czk || ""} onChange={(e) => setD({ ...d, czk: Number(e.target.value), pct: 0 })} />
        </label>
      </div>
      <label className="block">
        <span className="label mb-1 block text-[11px] text-muted">Důvod (na účtence)</span>
        <input value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} placeholder="např. poškozený obal" />
      </label>
      <div className="flex gap-2">
        <Button type="submit" className="min-h-10">
          Použít
        </Button>
        <Button type="button" variant="secondary" onClick={() => onSubmit({ czk: 0, pct: 0, note: "" })} className="min-h-10">
          Bez slevy
        </Button>
      </div>
    </form>
  );
}

function PayPanel({ total, iban, shopName, pending, onPay }: { total: number; iban: string | null; shopName: string; pending: boolean; onPay: (p: PosPayment, cash?: number) => void }) {
  const [method, setMethod] = useState<PosPayment>("hotove");
  const [received, setReceived] = useState("");
  const [qr, setQr] = useState<{ key: string; url: string } | null>(null);
  const qrKey = `${iban}|${total}`;
  const cash = Number(received) || 0;
  const change = cash - total;
  const quick = Array.from(new Set([total, Math.ceil(total / 100) * 100, Math.ceil(total / 200) * 200, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000, Math.ceil(total / 2000) * 2000])).filter((v) => v >= total).slice(0, 5);
  useEffect(() => {
    if (method !== "qr" || !iban) return;
    let live = true;
    QRCode.toDataURL(spdString(iban, total, `${shopName} kasa`), { width: 260, margin: 1, color: { dark: "#1f3a2d", light: "#fbf7ee" } }).then((url) => {
      if (live) setQr({ key: `${iban}|${total}`, url });
    });
    return () => {
      live = false;
    };
  }, [method, iban, total, shopName]);
  const key = (k: string) => setReceived((r) => (k === "C" ? "" : (r + k).replace(/^0+(?=\d)/, "").slice(0, 6)));
  const methodBtn = (id: PosPayment, label: string, Icon: typeof Banknote) => (
    <button type="button" onClick={() => setMethod(id)} aria-pressed={method === id} className={`label flex min-h-[84px] flex-1 flex-col items-center justify-center gap-1.5 rounded-[var(--radius-card)] border-2 text-[12px] ${method === id ? "border-green bg-green text-cream" : "border-line bg-paper text-green hover:border-green"}`}>
      <Icon strokeWidth={1.75} className="h-6 w-6" />
      {label}
    </button>
  );
  const finish = () => onPay(method, method === "hotove" ? (received === "" ? total : cash) : undefined);
  const canFinish = !pending && (method !== "hotove" || received === "" || cash >= total) && (method !== "qr" || Boolean(iban));

  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <p className="label text-[11px] text-muted">1. Jak zákazník platí</p>
        <div className="mt-2 flex gap-3">
          {methodBtn("hotove", "Hotově", Banknote)}
          {methodBtn("karta", "Kartou", CreditCard)}
          {methodBtn("qr", "QR platba", QrCode)}
        </div>
      </div>

      {method === "hotove" && (
        <div className="grid gap-5 md:grid-cols-[1fr_260px]">
          <div>
            <p className="label text-[11px] text-muted">2. Kolik dal</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {quick.map((v) => (
                <button key={v} type="button" onClick={() => setReceived(String(v))} aria-pressed={received === String(v)} className={`label min-h-12 min-w-[96px] rounded-[var(--radius-control)] border-2 px-3 text-[12px] ${received === String(v) ? "border-green bg-green text-cream" : "border-line bg-paper text-green hover:border-green"}`}>
                  {formatPrice(v)}
                </button>
              ))}
            </div>
            <div className="mt-3 grid max-w-[360px] grid-cols-3 gap-2">
              {["7", "8", "9", "4", "5", "6", "1", "2", "3", "C", "0", "00"].map((k) => (
                <button key={k} type="button" onClick={() => key(k)} className={`min-h-[56px] rounded-[var(--radius-card)] border border-line bg-paper font-display text-[22px] font-semibold hover:border-green ${k === "C" ? "text-brick-text" : ""}`} aria-label={k === "C" ? "Smazat" : k}>
                  {k}
                </button>
              ))}
            </div>
          </div>
          <div className="self-start rounded-[var(--radius-card)] border border-line bg-paper p-4">
            <p className="label text-[11px] text-muted">Přijato</p>
            <p className="font-display text-[32px] font-semibold">{received ? formatPrice(cash) : formatPrice(total)}</p>
            <p className="label mt-2 text-[11px] text-muted">Vrátit</p>
            <p className={`font-display text-[32px] font-semibold ${change < 0 && received ? "text-brick-text" : "text-brick-text"}`}>{received ? (change < 0 ? "chybí " + formatPrice(-change) : formatPrice(change)) : formatPrice(0)}</p>
          </div>
        </div>
      )}
      {method === "karta" && <p className="text-sm text-muted">Zadejte částku {formatPrice(total)} do terminálu. Po schválení dokončete prodej.</p>}
      {method === "qr" && (
        <div className="flex items-center gap-5">
          {iban ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL z knihovny qrcode */}
              {qr?.key === qrKey && <img src={qr.url} alt="QR platba" width={220} height={220} className="rounded-[var(--radius-card)] border border-line" />}
              <p className="max-w-xs text-sm text-muted">Zákazník načte kód v bankovní aplikaci. Po potvrzení odeslání dokončete prodej.</p>
            </>
          ) : (
            <p className="text-sm text-brick-text">V Nastavení → Platba chybí číslo účtu, QR platbu nejde vytvořit.</p>
          )}
        </div>
      )}

      <div className="mt-auto flex gap-3">
        <Button type="button" variant="action" className="min-h-14 flex-1 text-[14px]" disabled={!canFinish} onClick={finish}>
          {pending ? "Ukládám…" : `Dokončit prodej ${formatPrice(total)}`}
        </Button>
      </div>
      <p className="text-xs text-muted">Účtenka se tiskne až po dokončení, jen na přání zákazníka.</p>
    </div>
  );
}

function StornoForm({ onSubmit }: { onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(reason);
      }}
    >
      <p className="text-sm text-muted">Storno vrátí zboží na sklad a odečte připsané Kostičky. Zapíše se, kdo a proč.</p>
      <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Důvod" required className="mt-3" />
      <Button type="submit" variant="action" className="mt-3 min-h-11 w-full">
        Stornovat účtenku
      </Button>
    </form>
  );
}

/** Obsluha smí stornovat jen vlastní účtenku do 10 minut od prodeje, správce kdykoli (hlídá i databáze). */
function canStorno(s: PosSaleRow, manager: boolean, userId: string) {
  if (s.status !== "zaplaceno") return false;
  if (manager) return true;
  return s.cashier === userId && Date.now() - new Date(s.created_at).getTime() < 10 * 60 * 1000;
}

function TodayTab({ manager, userId, onStorno, refreshKey }: { manager: boolean; userId: string; onStorno: (s: PosSaleRow) => void; refreshKey: number }) {
  const [sales, setSales] = useState<(PosSaleRow & { customers: { name: string } | null })[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, PosSaleItemRow[]>>({});
  useEffect(() => {
    posRecentSales().then(setSales);
  }, [refreshKey]);
  return (
    <section className="flex-1 overflow-y-auto p-4">
      <h2 className="text-[20px]">Poslední účtenky</h2>
      {sales.length === 0 ? (
        <p className="mt-2 text-muted">Zatím žádný prodej.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line rounded-[var(--radius-card)] border border-line bg-paper text-sm">
          {sales.map((s) => (
            <li key={s.id} className="p-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(open === s.id ? null : s.id);
                    if (!items[s.id] && !s.order_id) posSaleItems(s.id).then((it) => setItems((m) => ({ ...m, [s.id]: it })));
                  }}
                  className="font-semibold text-green hover:underline"
                >
                  {s.number}
                </button>
                <span className="text-muted">{formatDate(s.created_at)}</span>
                <span>{POS_PAYMENT_LABEL[s.payment]}</span>
                {s.customers && <span className="text-muted">{s.customers.name}</span>}
                {s.order_id && <span className="text-muted">výdej objednávky</span>}
                <span className={`ml-auto font-display text-[18px] font-semibold ${s.status === "storno" ? "text-muted line-through" : "text-green"}`}>{formatPrice(s.total_czk)}</span>
                <a href={`/admin/kasa/uctenka/${s.id}`} target="_blank" rel="noopener" className="text-xs text-green underline">
                  účtenka
                </a>
                {canStorno(s, manager, userId) && (
                  <button type="button" onClick={() => onStorno(s)} className="text-xs text-brick-text underline">
                    storno
                  </button>
                )}
                {s.status === "storno" && <span className="label text-[10px] text-brick-text">storno · {s.cancel_reason}</span>}
              </div>
              {open === s.id && items[s.id] && (
                <ul className="mt-2 text-xs text-muted">
                  {items[s.id].map((i) => (
                    <li key={i.id}>
                      {Number(i.qty)} {i.unit} × {i.name} · {formatPrice(i.line_total_czk)}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ShiftTab({ shift, onChange, say }: { shift: Shift; onChange: (s: Shift) => void; say: (t: string) => void }) {
  const [opening, setOpening] = useState("");
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [move, setMove] = useState({ kind: "vklad" as "vklad" | "vyber", amount: "", note: "" });
  const [result, setResult] = useState<CloseResult | null>(null);
  const [pending, startTransition] = useTransition();
  const refresh = () => posShiftSummary().then(onChange);

  if (result) {
    return (
      <section className="flex-1 overflow-y-auto p-4">
        <h2 className="text-[20px]">Uzávěrka hotová</h2>
        <dl className="mt-3 grid max-w-md gap-2 text-sm">
          {(
            [
              ["Účtenek", String(result.count)],
              ["Storn", String(result.cancelled)],
              ["Hotově", formatPrice(result.cash)],
              ["Kartou", formatPrice(result.card)],
              ["QR platbou", formatPrice(result.qr)],
              ["Očekávaná hotovost", formatPrice(result.expected)],
              ["Napočítáno", formatPrice(result.counted)],
              ["Rozdíl", formatPrice(result.difference)],
            ] as [string, string][]
          ).map(([k, v]) => (
            <div key={k} className={`flex justify-between border-b border-line py-1 ${k === "Rozdíl" && result.difference !== 0 ? "text-brick-text" : ""}`}>
              <dt className="text-muted">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
        <Button type="button" className="mt-4 min-h-11" onClick={() => setResult(null)}>
          Zavřít
        </Button>
      </section>
    );
  }

  if (!shift.shift) {
    return (
      <section className="flex-1 overflow-y-auto p-4">
        <h2 className="text-[20px]">Otevřít směnu</h2>
        <p className="mt-1 text-sm text-muted">Napočítejte hotovost v pokladně a zadejte ji jako počáteční stav. Bez otevřené směny nejde prodávat.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await posOpenShift(Number(opening) || 0);
              if (!res.ok) return say(res.error);
              await refresh();
              say("Směna otevřena.");
            });
          }}
          className="mt-3 flex max-w-sm items-end gap-2"
        >
          <label className="block flex-1">
            <span className="label mb-1 block text-[11px] text-muted">Počáteční hotovost (Kč)</span>
            <input autoFocus type="number" inputMode="numeric" min={0} value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="např. 2000" />
          </label>
          <Button type="submit" disabled={pending} className="min-h-10">
            Otevřít
          </Button>
        </form>
      </section>
    );
  }

  return (
    <section className="flex-1 overflow-y-auto p-4">
      <h2 className="text-[20px]">Směna od {formatDate(shift.shift.opened_at)}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Účtenek" value={String(shift.count)} />
        <Stat label="Hotově" value={formatPrice(shift.cash)} />
        <Stat label="Kartou" value={formatPrice(shift.card)} />
        <Stat label="QR platbou" value={formatPrice(shift.qr)} />
      </div>
      <p className="mt-3 text-sm text-muted">
        Počáteční hotovost {formatPrice(shift.shift.opening_cash_czk)}, očekávaná hotovost v pokladně nyní <strong className="text-ink">{formatPrice(shift.expected)}</strong>.
        {shift.cancelled > 0 ? ` Storn: ${shift.cancelled}.` : ""}
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await posCashMove(move.kind, Number(move.amount) || 0, move.note);
              if (!res.ok) return say(res.error);
              setMove({ kind: "vklad", amount: "", note: "" });
              await refresh();
            });
          }}
          className="rounded-[var(--radius-card)] border border-line bg-paper p-4"
        >
          <h3 className="text-[16px]">Vklad a výběr hotovosti</h3>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <select value={move.kind} onChange={(e) => setMove({ ...move, kind: e.target.value as "vklad" | "vyber" })} aria-label="Druh" className="w-auto min-h-10">
              <option value="vklad">Vklad</option>
              <option value="vyber">Výběr</option>
            </select>
            <input type="number" min={1} value={move.amount} onChange={(e) => setMove({ ...move, amount: e.target.value })} placeholder="Kč" aria-label="Částka" className="w-28 min-h-10" required />
            <input value={move.note} onChange={(e) => setMove({ ...move, note: e.target.value })} placeholder="Poznámka" aria-label="Poznámka" className="min-h-10 flex-1" />
            <Button type="submit" variant="secondary" disabled={pending} className="min-h-10">
              Zapsat
            </Button>
          </div>
          {shift.moves.length > 0 && (
            <ul className="mt-3 text-sm">
              {shift.moves.map((m) => (
                <li key={m.id} className="flex justify-between border-t border-line py-1">
                  <span className="text-muted">
                    {formatDate(m.created_at)} · {m.kind === "vklad" ? "vklad" : "výběr"}
                    {m.note ? ` · ${m.note}` : ""}
                  </span>
                  <span className={m.kind === "vyber" ? "text-brick-text" : "text-green"}>
                    {m.kind === "vyber" ? "−" : "+"}
                    {formatPrice(m.amount_czk)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </form>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const res = await posCloseShift(Number(counted) || 0, note);
              if (!res.ok) return say(res.error);
              setResult(res);
              setCounted("");
              setNote("");
              await refresh();
            });
          }}
          className="rounded-[var(--radius-card)] border border-line bg-paper p-4"
        >
          <h3 className="text-[16px]">Uzávěrka</h3>
          <p className="mt-1 text-xs text-muted">Napočítejte hotovost v pokladně. Rozdíl proti očekávanému stavu se uloží.</p>
          <label className="mt-2 block">
            <span className="label mb-1 block text-[11px] text-muted">Napočítaná hotovost (Kč)</span>
            <input type="number" inputMode="numeric" min={0} value={counted} onChange={(e) => setCounted(e.target.value)} required />
          </label>
          <label className="mt-2 block">
            <span className="label mb-1 block text-[11px] text-muted">Poznámka</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <Button type="submit" variant="action" disabled={pending} className="mt-3 min-h-11 w-full">
            Uzavřít směnu
          </Button>
        </form>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-paper p-3">
      <p className="label text-[11px] text-muted">{label}</p>
      <p className="font-display text-[24px] font-semibold text-green">{value}</p>
    </div>
  );
}
