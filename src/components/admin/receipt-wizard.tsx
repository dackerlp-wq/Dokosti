"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useMemo, useRef, useState } from "react";
import { postReceipt, type ReceiptLine, type ReceiptState } from "@/app/admin/(app)/sklad/actions";
import { Button } from "@/components/ui/button";
import type { ProductUnit } from "@/lib/catalog";
import { formatPrice } from "@/lib/format";

export type ReceiptProduct = { id: string; name: string; unit: ProductUnit; storage: string; purchase_price_czk: number | null; price_czk: number; ean: string | null; supplier_id: string | null };
export type ReceiptSupplier = { id: string; name: string };
export type OpenOrder = { id: string; number: string; supplier_id: string; supplier_name: string; expected_on: string | null; items: { product_id: string; qty: number; unit_cost_czk: number }[] };

type Line = ReceiptLine & { key: string; ordered_qty: number | null };
let seq = 0;
const newLine = (p?: ReceiptProduct, qty = 1, cost?: number, ordered: number | null = null): Line => ({ key: `r${++seq}`, product_id: p?.id ?? "", qty, unit_cost_czk: cost ?? p?.purchase_price_czk ?? 0, batch_no: "", expires_on: "", ordered_qty: ordered });
const DAY = 86_400_000;

/**
 * Příjemka ve čtyřech krocích: dodavatel a doklad → položky (čtečka nebo hledání) → kontrola rozdílů a cen → zaúčtováno.
 * Z objednávky u dodavatele se položky předvyplní a rozdíly se ukážou před zaúčtováním.
 */
export function ReceiptWizard({ products, suppliers, orders, manager, initialOrderId, today }: { products: ReceiptProduct[]; suppliers: ReceiptSupplier[]; orders: OpenOrder[]; manager: boolean; initialOrderId?: string; today: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ReceiptState, FormData>(postReceipt, null);
  const initialOrder = orders.find((o) => o.id === initialOrderId) ?? null;
  const [step, setStep] = useState(1);
  const [orderId, setOrderId] = useState(initialOrder?.id ?? "");
  const [supplier, setSupplier] = useState(initialOrder?.supplier_name ?? "");
  const [docNo, setDocNo] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [invoiceTotal, setInvoiceTotal] = useState("");
  const [note, setNote] = useState("");
  const byId = (id: string) => products.find((p) => p.id === id);
  const fromOrder = (o: OpenOrder | null): Line[] => (o ? o.items.map((i) => newLine(byId(i.product_id), i.qty, i.unit_cost_czk, i.qty)).filter((l) => l.product_id) : []);
  const [lines, setLines] = useState<Line[]>(() => (initialOrder ? fromOrder(initialOrder) : [newLine()]));
  const [scan, setScan] = useState("");
  const scanRef = useRef<HTMLInputElement>(null);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  const set = (key: string, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));
  const valid = lines.filter((l) => l.product_id && l.qty > 0);
  const total = valid.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unit_cost_czk) || 0), 0);
  const suggestions = useMemo(() => {
    const q = scan.trim().toLowerCase();
    if (q.length < 2) return [];
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.ean ?? "").includes(q)).slice(0, 8);
  }, [scan, products]);

  function addProduct(p: ReceiptProduct, qty = 1) {
    setLines((ls) => {
      const i = ls.findIndex((l) => l.product_id === p.id);
      if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, qty: Number(l.qty) + qty } : l));
      const empty = ls.findIndex((l) => !l.product_id);
      const line = newLine(p, qty);
      return empty >= 0 ? ls.map((l, j) => (j === empty ? line : l)) : [...ls, line];
    });
    setScanMsg(`Přidáno: ${p.name}`);
    setScan("");
    scanRef.current?.focus();
  }
  function onScanEnter() {
    const code = scan.trim();
    if (!code) return;
    const byEan = products.find((p) => p.ean && p.ean === code);
    if (byEan) return addProduct(byEan);
    if (suggestions.length === 1) return addProduct(suggestions[0]);
    setScanMsg(suggestions.length ? "Vyberte ze seznamu." : "Nic nenalezeno. Nový produkt založte v Produktech.");
  }

  // Kontrola: rozdíly oproti objednávce, změny nákupní ceny, blízké expirace, nesoulad s fakturou.
  const checks = valid.flatMap((l) => {
    const p = byId(l.product_id);
    if (!p) return [];
    const out: { kind: string; text: string; warn: boolean }[] = [];
    if (l.ordered_qty !== null && Number(l.qty) !== Number(l.ordered_qty)) out.push({ kind: "Rozdíl", text: `${p.name}: objednáno ${l.ordered_qty} ${p.unit}, přijato ${l.qty} ${p.unit}.`, warn: true });
    if (manager && p.purchase_price_czk && l.unit_cost_czk > 0 && Math.abs(l.unit_cost_czk - p.purchase_price_czk) / p.purchase_price_czk > 0.02) {
      const margin = p.price_czk > 0 ? Math.round(((p.price_czk - l.unit_cost_czk) / p.price_czk) * 100) : null;
      out.push({ kind: "Cena", text: `${p.name}: nákup ${formatPrice(l.unit_cost_czk)}, dřív ${formatPrice(p.purchase_price_czk)} (${l.unit_cost_czk > p.purchase_price_czk ? "+" : ""}${Math.round(((l.unit_cost_czk - p.purchase_price_czk) / p.purchase_price_czk) * 100)} %)${margin !== null ? `, marže při ${formatPrice(p.price_czk)} je ${margin} %` : ""}.`, warn: l.unit_cost_czk > p.purchase_price_czk });
    }
    if (l.expires_on && new Date(l.expires_on + "T12:00:00").getTime() - new Date(today + "T12:00:00").getTime() < 30 * DAY) out.push({ kind: "Expirace", text: `${p.name}: šarže ${l.batch_no || "bez čísla"} expiruje ${l.expires_on}, prodat do měsíce.`, warn: true });
    if (p.storage !== "suche" && !l.expires_on) out.push({ kind: "Šarže", text: `${p.name}: mražené nebo chlazené zboží bez expirace. Doplňte ji, aby Sklad hlídal šarže.`, warn: false });
    return out;
  });
  const orderedMissing = orderId ? (orders.find((o) => o.id === orderId)?.items ?? []).filter((i) => !valid.some((l) => l.product_id === i.product_id)) : [];
  for (const m of orderedMissing) checks.push({ kind: "Chybí", text: `${byId(m.product_id)?.name ?? "Produkt"}: objednáno ${m.qty}, nepřišlo nic.`, warn: true });
  const invoiceDiff = invoiceTotal && manager ? Math.round(Number(invoiceTotal) - total) : 0;
  if (invoiceTotal && manager && invoiceDiff !== 0) checks.push({ kind: "Faktura", text: `Součet položek ${formatPrice(Math.round(total))}, faktura ${formatPrice(Number(invoiceTotal))}: rozdíl ${formatPrice(invoiceDiff)} (doprava, zaokrouhlení?). Příjemka se zaúčtuje, rozdíl se poznamená.`, warn: false });

  if (state?.ok) {
    return (
      <div className="rounded-card border border-line bg-white p-5">
        <Steps step={4} />
        <h2 className="mt-4 text-[22px]">Příjemka {state.number} je zaúčtovaná</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>Sklad je navýšený, pohyby jsou v deníku skladu.</li>
          <li>Šarže s expirací jsou založené, Sklad je hlídá a prodej z nich odečítá nejstarší.</li>
          {manager && <li>Nákupní ceny jsou uložené, marže přepočítané.</li>}
          {state.taskCreated && <li>Vznikl úkol zaplatit fakturu do splatnosti.</li>}
          {state.orderClosed && <li>Objednávka u dodavatele je označená jako přijatá.</li>}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" onClick={() => { router.push("/admin/sklad/prijemky"); router.refresh(); }}>
            Další příjemka
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push("/admin/sklad")}>
            Otevřít Sklad
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="rounded-card border border-line bg-white p-5">
      <input type="hidden" name="lines" value={JSON.stringify(valid.map(({ product_id, qty, unit_cost_czk, batch_no, expires_on, ordered_qty }) => ({ product_id, qty, unit_cost_czk, batch_no, expires_on, ordered_qty })))} />
      <input type="hidden" name="purchase_order_id" value={orderId} />
      <input type="hidden" name="supplier" value={supplier} />
      <input type="hidden" name="doc_no" value={docNo} />
      <input type="hidden" name="due_on" value={dueOn} />
      <input type="hidden" name="invoice_total_czk" value={invoiceTotal} />
      <input type="hidden" name="note" value={note} />
      <Steps step={step} />

      {step === 1 && (
        <div className="mt-4 space-y-4">
          <div>
            <h2 className="text-[20px]">Od koho zboží je</h2>
            <p className="text-sm text-muted">Z objednávky u dodavatele se položky předvyplní a v kroku 3 uvidíte rozdíly.</p>
          </div>
          {orders.length > 0 && (
            <label className="block">
              <span className="mb-1 block text-label text-green">Objednávka u dodavatele</span>
              <select
                value={orderId}
                onChange={(e) => {
                  const o = orders.find((x) => x.id === e.target.value) ?? null;
                  setOrderId(o?.id ?? "");
                  if (o) {
                    setSupplier(o.supplier_name);
                    setLines(fromOrder(o));
                  }
                }}
              >
                <option value="">bez objednávky</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.number} · {o.supplier_name} · {o.items.length} položek{o.expected_on ? ` · ${o.expected_on}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-label text-green">Dodavatel</span>
              <input list="dodavatele" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="např. Yoggies" required />
              <datalist id="dodavatele">
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="mb-1 block text-label text-green">Číslo dodacího listu / faktury</span>
              <input value={docNo} onChange={(e) => setDocNo(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-label text-green">Splatnost faktury</span>
              <input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
              <span className="mt-1 block text-small text-muted">Vznikne úkol zaplatit.</span>
            </label>
            {manager && (
              <label className="block">
                <span className="mb-1 block text-label text-green">Částka na faktuře (Kč)</span>
                <input type="number" min={0} step="0.01" value={invoiceTotal} onChange={(e) => setInvoiceTotal(e.target.value)} />
                <span className="mt-1 block text-small text-muted">Porovná se se součtem položek.</span>
              </label>
            )}
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-label text-green">Poznámka</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="např. jedna krabice promáčklá, řešeno s řidičem" />
            </label>
          </div>
          <div className="flex justify-between">
            <span className="text-small text-muted">Krok 1 ze 3</span>
            <Button type="button" onClick={() => { setStep(2); setTimeout(() => scanRef.current?.focus(), 0); }} disabled={!supplier.trim()}>
              Pokračovat na položky
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-4 space-y-4">
          <div>
            <h2 className="text-[20px]">Co přišlo</h2>
            <p className="text-sm text-muted">Načtěte čárový kód z krabice nebo pište název. Každé načtení přidá 1 ks, množství pak upravíte v řádku.</p>
          </div>
          <div className="relative">
            <input
              ref={scanRef}
              value={scan}
              onChange={(e) => { setScan(e.target.value); setScanMsg(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onScanEnter(); } }}
              placeholder="Načtěte EAN nebo pište název produktu…"
              aria-label="Produkt"
              className="min-h-11 text-base"
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full rounded-control border border-line bg-white">
                {suggestions.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => addProduct(p)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-paper">
                      <span>{p.name}</span>
                      <span className="text-small text-muted">{p.ean ?? ""}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {scanMsg && <p className="text-small text-muted">{scanMsg}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-eyebrow uppercase text-muted">
                  <th className="py-2 pr-2 font-semibold">Produkt</th>
                  {orderId && <th className="py-2 pr-2 font-semibold">Objednáno</th>}
                  <th className="py-2 pr-2 font-semibold">Přijato</th>
                  {manager && <th className="py-2 pr-2 font-semibold">Nákup / j.</th>}
                  <th className="py-2 pr-2 font-semibold">Šarže</th>
                  <th className="py-2 pr-2 font-semibold">Expirace</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lines.map((l) => {
                  const p = byId(l.product_id);
                  const diff = l.ordered_qty !== null && Number(l.qty) !== Number(l.ordered_qty);
                  return (
                    <tr key={l.key}>
                      <td className="py-2 pr-2">
                        {p ? (
                          <span className="font-semibold">{p.name}</span>
                        ) : (
                          <select value={l.product_id} onChange={(e) => { const np = byId(e.target.value); set(l.key, { product_id: e.target.value, unit_cost_czk: np?.purchase_price_czk ?? 0 }); }} aria-label="Produkt" className="min-h-9 min-w-[220px] py-1">
                            <option value="">vyberte…</option>
                            {products.map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      {orderId && <td className="py-2 pr-2 whitespace-nowrap text-muted">{l.ordered_qty ?? "—"}</td>}
                      <td className="py-2 pr-2">
                        <span className="flex items-center gap-1">
                          <input type="number" min={0} step={p?.unit === "kg" ? "0.001" : "1"} value={l.qty} onChange={(e) => set(l.key, { qty: Number(e.target.value) })} aria-label="Množství" className={`w-24 min-h-9 py-1 ${diff ? "border-ochre" : ""}`} />
                          <span className="text-muted">{p?.unit ?? "ks"}</span>
                        </span>
                      </td>
                      {manager && (
                        <td className="py-2 pr-2">
                          <input type="number" min={0} step="0.01" value={l.unit_cost_czk} onChange={(e) => set(l.key, { unit_cost_czk: Number(e.target.value) })} aria-label="Nákupní cena" className="w-24 min-h-9 py-1" />
                        </td>
                      )}
                      <td className="py-2 pr-2">
                        <input value={l.batch_no} onChange={(e) => set(l.key, { batch_no: e.target.value })} aria-label="Šarže" className="w-28 min-h-9 py-1" />
                      </td>
                      <td className="py-2 pr-2">
                        <input type="date" value={l.expires_on} onChange={(e) => set(l.key, { expires_on: e.target.value })} aria-label="Expirace" className="min-h-9 py-1" disabled={p ? p.storage === "suche" : false} />
                      </td>
                      <td className="py-2 text-right">
                        <button type="button" onClick={() => setLines(lines.length > 1 ? lines.filter((x) => x.key !== l.key) : [newLine()])} aria-label="Odebrat řádek" className="inline-flex h-8 w-8 items-center justify-center rounded-control text-muted hover:bg-paper hover:text-brick-text">
                          <Trash2 strokeWidth={1.75} className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => setLines([...lines, newLine()])} className="inline-flex items-center gap-1 text-sm text-brick-text hover:underline">
              <Plus strokeWidth={1.75} className="h-4 w-4" /> Přidat řádek ručně
            </button>
            <span className="text-sm text-muted">
              {valid.length} položek{manager ? ` · nákup celkem ${formatPrice(Math.round(total))}` : ""}
            </span>
          </div>
          <div className="flex justify-between">
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>
              Zpět
            </Button>
            <Button type="button" onClick={() => setStep(3)} disabled={valid.length === 0}>
              Pokračovat na kontrolu
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-4 space-y-4">
          <div>
            <h2 className="text-[20px]">Před zaúčtováním zkontrolujte</h2>
            <p className="text-sm text-muted">Zaúčtování zvýší sklad, založí šarže a uloží nákupní ceny. Zpět to jde jen opravou přes odpis nebo inventuru.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-card border border-line bg-paper p-3 text-sm">
              <p className="text-eyebrow uppercase text-muted">Dodavatel</p>
              <p className="font-semibold">{supplier}</p>
              <p className="text-small text-muted">{docNo ? `doklad ${docNo}` : "bez čísla dokladu"}{dueOn ? ` · splatnost ${dueOn}` : ""}</p>
            </div>
            <div className="rounded-card border border-line bg-paper p-3 text-sm">
              <p className="text-eyebrow uppercase text-muted">Položek</p>
              <p className="font-semibold">{valid.length}</p>
              <p className="text-small text-muted">{valid.filter((l) => l.expires_on).length} šarží s expirací</p>
            </div>
            <div className="rounded-card border border-line bg-paper p-3 text-sm">
              <p className="text-eyebrow uppercase text-muted">{manager ? "Nákup celkem" : "Objednávka"}</p>
              <p className="font-semibold">{manager ? formatPrice(Math.round(total)) : orderId ? orders.find((o) => o.id === orderId)?.number : "bez objednávky"}</p>
              {manager && invoiceTotal && <p className="text-small text-muted">faktura {formatPrice(Number(invoiceTotal))}</p>}
            </div>
          </div>
          {checks.length === 0 ? (
            <p className="text-sm text-green">Všechno sedí: množství podle objednávky, ceny bez změny.</p>
          ) : (
            <ul className="divide-y divide-line rounded-card border border-line">
              {checks.map((c, i) => (
                <li key={i} className="flex items-start gap-3 px-3 py-2 text-sm">
                  <span className={`text-button shrink-0 rounded-full px-2 py-0.5 ${c.warn ? "bg-ochre-badge text-ink" : "border border-line text-muted"}`}>{c.kind}</span>
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          )}
          {state?.error && (
            <p role="alert" className="text-sm text-brick-text">
              {state.error}
            </p>
          )}
          <div className="flex justify-between">
            <Button type="button" variant="secondary" onClick={() => setStep(2)}>
              Zpět na položky
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Účtuji…" : "Zaúčtovat příjemku"}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

function Steps({ step }: { step: number }) {
  const items = ["Dodavatel a doklad", "Položky", "Kontrola", "Zaúčtováno"];
  return (
    <ol className="flex overflow-hidden rounded-card border border-line">
      {items.map((label, i) => {
        const n = i + 1;
        const on = n === step;
        const done = n < step;
        return (
          <li key={label} className={`flex flex-1 items-center gap-2 border-r border-line px-3 py-2 text-small last:border-r-0 ${on ? "bg-paper text-ink" : "text-muted"}`}>
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${on ? "bg-green text-cream" : done ? "bg-olive text-cream" : "border border-line"}`}>{done ? "✓" : n}</span>
            <span className="hidden sm:inline">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
