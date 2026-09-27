"use client";

import { Banknote, CreditCard, Minus, Pause, Plus, QrCode, Search, Trash2, User, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { LINE_INFO, LINES, productName, type LineSlug } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";
import { POS_PAYMENT_LABEL, spdString, type CartLine, type PickupOrder, type PosCustomer, type PosPayment, type PosProduct, type PosSaleItemRow, type PosSaleRow } from "@/lib/pos";
import type { Settings } from "@/lib/settings";

type Tab = "prodej" | "vydej" | "odlozene" | "dnes" | "uzaverka";
type Shift = Awaited<ReturnType<typeof posShiftSummary>>;
type Parked = { id: string; name: string; at: string; lines: { productId: string; qty: number }[]; customer: PosCustomer | null };

const LINE_TILE: Record<LineSlug, string> = {
  zaklad: "bg-green text-cream",
  kosti: "bg-brick text-cream",
  navic: "bg-ochre text-ink",
  mlsky: "bg-olive text-cream",
  granule: "bg-muted text-cream",
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
  const [modal, setModal] = useState<null | { kind: "pay" } | { kind: "kg"; product: PosProduct } | { kind: "customer" } | { kind: "card"; code: string } | { kind: "discount" } | { kind: "done"; id: string; number: string; total: number; change: number | null; points: number } | { kind: "settle"; order: PickupOrder } | { kind: "storno"; sale: PosSaleRow }>(null);
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
    // neznámý kód: zkusit zákaznickou kartu
    if (/^[A-Za-z0-9-]{4,32}$/.test(c) && !/\s/.test(c)) {
      startTransition(async () => {
        const found = await posCustomerByCard(c);
        if (found) {
          setCustomer(found);
          setPointsRedeem(0);
          setQuery("");
          say(`Zákazník: ${found.name}`);
        } else setModal({ kind: "card", code: c.toUpperCase() });
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
      <header className="flex flex-wrap items-center gap-2 border-b border-line bg-paper px-3 py-2">
        <Link href="/admin" className="font-display text-[20px] font-semibold text-green">
          DoKosti
        </Link>
        <nav className="flex gap-1 overflow-x-auto" aria-label="Kasa">
          {(
            [
              ["prodej", "Prodej"],
              ["vydej", `K výdeji${pickup.length ? ` (${pickup.length})` : ""}`],
              ["odlozene", `Odložené${parked.length ? ` (${parked.length})` : ""}`],
              ["dnes", "Dnes"],
              ["uzaverka", noShift ? "Otevřít směnu" : "Uzávěrka"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={tab === id} className={`label min-h-10 whitespace-nowrap rounded-[var(--radius-control)] px-3 text-[11px] ${tab === id ? "bg-green text-cream" : "text-green hover:bg-cream"} ${id === "uzaverka" && noShift ? "text-brick-text" : ""}`}>
              {label}
            </button>
          ))}
        </nav>
        <span className="ml-auto truncate text-xs text-muted">{userEmail}</span>
        {toast && (
          <span role="status" className="rounded-[var(--radius-control)] bg-green px-3 py-1 text-sm text-cream">
            {toast}
          </span>
        )}
      </header>

      {tab === "prodej" && (
        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[1fr_360px] lg:grid-cols-[1fr_400px]">
          {/* Produkty */}
          <section className="flex min-h-0 flex-col border-r border-line">
            <div className="flex flex-wrap items-center gap-2 p-3">
              <div className="relative flex-1">
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
                  placeholder="Hledat nebo načíst kód…"
                  aria-label="Hledat produkt nebo načíst kód"
                  className="pl-9"
                />
              </div>
              <div className="flex gap-1 overflow-x-auto">
                {(["vse", ...LINES] as (LineSlug | "vse")[]).map((l) => (
                  <button key={l} type="button" onClick={() => setLine(l)} aria-pressed={line === l} className={`label min-h-10 whitespace-nowrap rounded-[var(--radius-control)] border px-3 text-[11px] ${line === l ? "border-green bg-green text-cream" : "border-line bg-paper text-green"}`}>
                    {l === "vse" ? "Vše" : LINE_INFO[l].name}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto p-3 pt-0 sm:grid-cols-3 xl:grid-cols-4">
              {visible.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addProduct(p)}
                  disabled={!p.in_stock}
                  className={`flex min-h-[88px] flex-col justify-between rounded-[var(--radius-card)] p-3 text-left ${LINE_TILE[p.line]} disabled:opacity-40`}
                >
                  <span className="text-[15px] font-semibold leading-tight">{p.variant}</span>
                  <span className="mt-2 flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-display text-[17px] font-semibold">
                      {formatPrice(p.price_czk)}
                      {p.unit === "kg" ? "/kg" : ""}
                    </span>
                    <span className="opacity-80">{p.stock_qty !== null ? fmtQty(p.stock_qty, p.unit) : ""}</span>
                  </span>
                </button>
              ))}
              {visible.length === 0 && <p className="col-span-full p-4 text-muted">Nic nenalezeno.</p>}
            </div>
          </section>

          {/* Účtenka */}
          <aside className="flex min-h-0 flex-col bg-paper">
            <div className="flex items-center gap-2 border-b border-line p-3">
              <button type="button" onClick={() => setModal({ kind: "customer" })} className="flex min-h-10 flex-1 items-center gap-2 rounded-[var(--radius-control)] border border-line px-3 text-left text-sm hover:border-green">
                <User strokeWidth={1.75} className="h-4 w-4 text-green" />
                {customer ? (
                  <span className="truncate">
                    <strong>{customer.name}</strong>
                    {loyalty.enabled && <span className="text-muted"> · {customer.points} Kostiček</span>}
                  </span>
                ) : (
                  <span className="text-muted">Zákazník (volitelně)</span>
                )}
              </button>
              {customer && (
                <button type="button" onClick={() => { setCustomer(null); setPointsRedeem(0); }} aria-label="Odebrat zákazníka" className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] text-muted hover:bg-cream">
                  <X strokeWidth={1.75} className="h-4 w-4" />
                </button>
              )}
            </div>
            <ul className="flex-1 divide-y divide-line overflow-y-auto">
              {lines.length === 0 && <li className="p-4 text-sm text-muted">Klepněte na produkt nebo načtěte kód.</li>}
              {lines.map((l) => (
                <li key={l.product.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{productName(l.product)}</p>
                    <p className="text-xs text-muted">
                      {fmtQty(l.qty, l.product.unit)} × {formatPrice(l.product.price_czk)}
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
                    <button type="button" onClick={() => setModal({ kind: "kg", product: l.product })} className="text-xs text-green underline">
                      změnit
                    </button>
                  )}
                  <span className="w-20 text-right font-semibold tabular-nums">{formatPrice(Math.round(l.qty * l.product.price_czk))}</span>
                  <QtyBtn label="Odebrat" onClick={() => setQty(l.product.id, 0)}>
                    <Trash2 strokeWidth={1.75} className="h-4 w-4" />
                  </QtyBtn>
                </li>
              ))}
            </ul>
            <div className="border-t border-line p-3 text-sm">
              <div className="flex justify-between text-muted">
                <span>Zboží</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {manualDiscount > 0 && (
                <div className="flex justify-between text-brick-text">
                  <span>Sleva{discount.note ? ` · ${discount.note}` : ""}</span>
                  <span>−{formatPrice(manualDiscount)}</span>
                </div>
              )}
              {pointsCzk > 0 && (
                <div className="flex justify-between text-brick-text">
                  <span>Kostičky ({pointsRedeem})</span>
                  <span>−{formatPrice(pointsCzk)}</span>
                </div>
              )}
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
                {manager && (
                  <button type="button" onClick={() => setModal({ kind: "discount" })} className="text-xs text-green underline">
                    {manualDiscount > 0 ? "upravit slevu" : "sleva"}
                  </button>
                )}
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="label text-[11px] text-muted">Celkem</span>
                <span className="font-display text-[30px] font-semibold text-green">{formatPrice(total)}</span>
              </div>
              <div className="mt-2 grid grid-cols-[auto_auto_1fr] gap-2">
                <Button type="button" variant="secondary" onClick={park} disabled={!lines.length} aria-label="Odložit účet" className="min-h-12 px-3">
                  <Pause strokeWidth={1.75} className="h-4 w-4" />
                </Button>
                <Button type="button" variant="secondary" onClick={clearSale} disabled={!lines.length && !customer} aria-label="Zrušit účet" className="min-h-12 px-3">
                  <Trash2 strokeWidth={1.75} className="h-4 w-4" />
                </Button>
                <Button type="button" variant="action" onClick={() => (noShift ? setTab("uzaverka") : setModal({ kind: "pay" }))} disabled={!lines.length || pending} className="min-h-12 text-[13px]">
                  {noShift ? "Otevřít směnu" : "Zaplatit"}
                </Button>
              </div>
            </div>
          </aside>
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
      {modal?.kind === "pay" && (
        <Modal title={`K zaplacení ${formatPrice(total)}`} onClose={() => setModal(null)} wide>
          <PayPanel total={total} iban={iban} shopName={shopName} pending={pending} onPay={pay} />
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
  const quick = Array.from(new Set([total, Math.ceil(total / 100) * 100, Math.ceil(total / 200) * 200, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000])).filter((v) => v >= total).slice(0, 5);
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
  const tabBtn = (id: PosPayment, label: string, Icon: typeof Banknote) => (
    <button type="button" onClick={() => setMethod(id)} aria-pressed={method === id} className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-[var(--radius-card)] border text-sm ${method === id ? "border-green bg-green text-cream" : "border-line bg-paper text-green hover:border-green"}`}>
      <Icon strokeWidth={1.75} className="h-5 w-5" />
      {label}
    </button>
  );
  return (
    <div>
      <div className="flex gap-2">
        {tabBtn("hotove", "Hotově", Banknote)}
        {tabBtn("karta", "Kartou", CreditCard)}
        {tabBtn("qr", "QR platba", QrCode)}
      </div>
      {method === "hotove" && (
        <div className="mt-4">
          <label className="block">
            <span className="label mb-1 block text-[11px] text-muted">Přijato (Kč)</span>
            <input autoFocus type="number" inputMode="numeric" min={0} value={received} onChange={(e) => setReceived(e.target.value)} placeholder={String(total)} className="text-[24px]" />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {quick.map((v) => (
              <button key={v} type="button" onClick={() => setReceived(String(v))} className="rounded-[var(--radius-control)] border border-line px-3 py-1.5 text-sm hover:border-green">
                {formatPrice(v)}
              </button>
            ))}
          </div>
          <p className="mt-3 text-lg">
            Vrátit: <strong className={change < 0 ? "text-brick-text" : "text-green"}>{received ? formatPrice(Math.max(0, change)) : "—"}</strong>
          </p>
          <Button type="button" variant="action" className="mt-3 min-h-12 w-full" disabled={pending || (received !== "" && cash < total)} onClick={() => onPay("hotove", received === "" ? total : cash)}>
            Zaplaceno hotově
          </Button>
        </div>
      )}
      {method === "karta" && (
        <div className="mt-4">
          <p className="text-sm text-muted">Zadejte částku {formatPrice(total)} do terminálu. Po schválení potvrďte.</p>
          <Button type="button" variant="action" className="mt-3 min-h-12 w-full" disabled={pending} onClick={() => onPay("karta")}>
            Zaplaceno kartou
          </Button>
        </div>
      )}
      {method === "qr" && (
        <div className="mt-4 text-center">
          {iban ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL z knihovny qrcode */}
              {qr?.key === qrKey && <img src={qr.url} alt="QR platba" width={260} height={260} className="mx-auto rounded-[var(--radius-card)] border border-line" />}
              <p className="mt-2 text-sm text-muted">Zákazník načte kód v bankovní aplikaci. Po připsání nebo potvrzení odeslání potvrďte.</p>
              <Button type="button" variant="action" className="mt-3 min-h-12 w-full" disabled={pending} onClick={() => onPay("qr")}>
                Zaplaceno převodem
              </Button>
            </>
          ) : (
            <p className="text-sm text-brick-text">V Nastavení → Platba chybí číslo účtu, QR platbu nejde vytvořit.</p>
          )}
        </div>
      )}
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
