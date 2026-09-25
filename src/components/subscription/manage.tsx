"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { manageSubscription } from "@/app/(shop)/predplatne/actions";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { DAY_NAMES, DAY_NAMES_SHORT, type Settings } from "@/lib/settings";
import { INTERVAL_LABEL } from "@/lib/shipping";
import { subscriptionSubtotal, SUBSCRIPTION_STATUS_LABEL, type SubscriptionView } from "@/lib/subscriptions";

const fmt = new Intl.DateTimeFormat("cs-CZ", { weekday: "long", day: "numeric", month: "long" });
const day = (iso: string) => fmt.format(new Date(iso + "T12:00:00"));

/**
 * Správa předplatného: přeskočit, pozastavit, změnit interval a den, upravit položky, zrušit.
 * Stejná komponenta slouží zákazníkovi (odkaz s tokenem) i administraci.
 */
export function SubscriptionManage({ initial, weekdays, settings, admin = false }: { initial: SubscriptionView; weekdays: number[]; settings: Settings["subscription"]; admin?: boolean }) {
  const [s, setS] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState(initial.items.map((i) => ({ slug: i.product_slug, qty: i.qty })));
  const [interval, setInterval] = useState(initial.interval_days);
  const [weekday, setWeekday] = useState(initial.weekday);

  function run(action: Parameters<typeof manageSubscription>[1], payload?: Record<string, unknown>, done?: string) {
    startTransition(async () => {
      const res = await manageSubscription(s.token, action, payload);
      if (res.ok) {
        setS(res.subscription);
        setItems(res.subscription.items.map((i) => ({ slug: i.product_slug, qty: i.qty })));
        setEditing(false);
        setMsg(done ? { ok: true, text: done } : null);
      } else setMsg({ ok: false, text: res.error });
    });
  }

  const active = s.status === "aktivni";
  const subtotal = subscriptionSubtotal(s);
  const discounted = settings.discountPct > 0 ? Math.round(subtotal * (1 - settings.discountPct / 100)) : subtotal;
  const pill = (on: boolean) => `rounded-[var(--radius-control)] border px-3 py-1 text-sm ${on ? "border-green bg-green text-cream" : "border-line bg-paper hover:border-green"}`;

  return (
    <div className="space-y-5">
      <div className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="label text-[11px] text-muted">Stav</p>
          <span className={`label text-[11px] ${active ? "text-green" : "text-brick-text"}`}>{SUBSCRIPTION_STATUS_LABEL[s.status]}</span>
        </div>
        {s.status === "zruseno" ? (
          <p className="mt-2 text-lg">Předplatné je zrušené. Chcete ho obnovit?</p>
        ) : s.status === "pozastaveno" ? (
          <p className="mt-2 text-lg">Předplatné je pozastavené, nic nevzniká. {s.last_error ? <span className="text-brick-text">Důvod: {s.last_error}.</span> : ""}</p>
        ) : (
          <p className="mt-2 text-lg">
            {s.skip_next ? (
              <>
                Dodávku <strong>{day(s.next_date)}</strong> přeskočíme, další bude o {s.interval_days} dní později.
              </>
            ) : (
              <>
                Další dodávka <strong>{day(s.next_date)}</strong>, {INTERVAL_LABEL[s.interval_days]}.
              </>
            )}
          </p>
        )}
        <p className="mt-1 text-sm text-muted">
          {s.shipping_method === "odber" ? "Osobní odběr v prodejně" : s.shipping_method === "rozvoz" ? `Rozvoz na ${s.street}, ${s.zip} ${s.city}` : `Přepravce na ${s.street}, ${s.zip} ${s.city}`} ·{" "}
          {s.payment_method === "prevod" ? "platba převodem" : s.payment_method === "hotove" ? "platba při převzetí" : "platba kartou"} · {s.customer_email}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {active && !s.skip_next && (
            <Button type="button" variant="secondary" disabled={pending} onClick={() => run("skip", {}, "Příští dodávku přeskočíme.")}>
              Přeskočit příští dodávku
            </Button>
          )}
          {active && s.skip_next && (
            <Button type="button" variant="secondary" disabled={pending} onClick={() => run("unskip", {}, "Dodávka zase platí.")}>
              Přece jen poslat
            </Button>
          )}
          {active && (
            <Button type="button" variant="secondary" disabled={pending} onClick={() => run("pause", {}, "Předplatné je pozastavené.")}>
              Pozastavit
            </Button>
          )}
          {!active && (
            <Button type="button" disabled={pending} onClick={() => run("resume", {}, "Předplatné zase běží.")}>
              Obnovit
            </Button>
          )}
          {s.status !== "zruseno" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (confirm("Opravdu zrušit pravidelný odběr? Objednané dodávky to neovlivní.")) run("cancel", {}, "Předplatné je zrušené.");
              }}
              className="label inline-flex min-h-10 items-center px-2 text-[11px] text-brick-text hover:underline"
            >
              Zrušit předplatné
            </button>
          )}
        </div>
        {msg && (
          <p role="status" className={`mt-3 text-sm ${msg.ok ? "text-green" : "text-brick-text"}`}>
            {msg.text}
          </p>
        )}
      </div>

      <div className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[20px]">Co posíláme</h2>
          {!editing && s.status !== "zruseno" && (
            <button type="button" onClick={() => setEditing(true)} className="text-sm text-green underline">
              Upravit množství
            </button>
          )}
        </div>
        <ul className="mt-3 divide-y divide-line text-sm">
          {(editing ? items : s.items.map((i) => ({ slug: i.product_slug, qty: i.qty }))).map((line) => {
            const info = s.items.find((i) => i.product_slug === line.slug);
            return (
              <li key={line.slug} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {info?.name ? (
                    <Link href={`/produkt/${line.slug}`} className="font-semibold hover:underline">
                      {info.name}
                    </Link>
                  ) : (
                    <span className="font-semibold">{line.slug}</span>
                  )}
                  {info?.available === false && <span className="ml-2 text-brick-text">teď není skladem</span>}
                </span>
                {editing ? (
                  <span className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={line.qty}
                      onChange={(e) => setItems(items.map((x) => (x.slug === line.slug ? { ...x, qty: Math.max(0, Math.min(99, Number(e.target.value) || 0)) } : x)))}
                      className="w-16 min-h-9 py-1 text-center"
                      aria-label={`Množství ${info?.name ?? line.slug}`}
                    />
                    <span className="text-muted">ks</span>
                  </span>
                ) : (
                  <span className="whitespace-nowrap">
                    {line.qty} × {info?.price_czk != null ? formatPrice(info.price_czk) : ""}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {editing ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button type="button" disabled={pending || items.every((i) => i.qty === 0)} onClick={() => run("items", { items: items.filter((i) => i.qty > 0).map((i) => ({ product_slug: i.slug, qty: i.qty })) }, "Množství jsme uložili.")}>
              Uložit
            </Button>
            <button type="button" onClick={() => { setEditing(false); setItems(s.items.map((i) => ({ slug: i.product_slug, qty: i.qty }))); }} className="text-sm text-muted underline">
              Zpět
            </button>
            <span className="text-xs text-muted">Množství 0 položku odebere. Něco přidat? Objednejte to jednou v e-shopu a napište nám, přidáme to.</span>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Zboží za dodávku podle aktuálních cen {formatPrice(subtotal)}
            {settings.discountPct > 0 ? `, po slevě ${settings.discountPct} % ${formatPrice(discounted)}` : ""}, plus doprava podle způsobu dodání.
          </p>
        )}
      </div>

      {s.status !== "zruseno" && (
        <div className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
          <h2 className="text-[20px]">Jak často a kdy</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {[7, 14, 28].map((i) => (
              <button key={i} type="button" onClick={() => setInterval(i)} aria-pressed={interval === i} className={pill(interval === i)}>
                {INTERVAL_LABEL[i]}
              </button>
            ))}
          </div>
          {weekdays.length > 1 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="label text-[11px] text-muted">Den</span>
              {weekdays.map((d) => (
                <button key={d} type="button" onClick={() => setWeekday(d)} aria-pressed={weekday === d} className={pill(weekday === d)}>
                  {DAY_NAMES_SHORT[d]}
                </button>
              ))}
            </div>
          )}
          {(interval !== s.interval_days || weekday !== s.weekday) && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button type="button" disabled={pending} onClick={() => run("interval", { interval_days: interval, weekday }, `Nově ${INTERVAL_LABEL[interval]}, vždy v ${DAY_NAMES[weekday]}.`)}>
                Uložit změnu
              </Button>
              <span className="text-xs text-muted">Další dodávka bude nejbližší {DAY_NAMES[weekday]}.</span>
            </div>
          )}
        </div>
      )}

      {!admin && (
        <p className="text-xs text-muted">
          Za každou dodávku platíte zvlášť, stejně jako u první objednávky. {settings.reminderDaysBefore} dny před dodávkou vám přijde e-mail, objednávka vzniká{" "}
          {settings.cutoffDaysBefore === 0 ? "v den dodání" : settings.cutoffDaysBefore === 1 ? "den předem" : `${settings.cutoffDaysBefore} dny předem`}; do té doby jdou změny udělat tady.
        </p>
      )}
    </div>
  );
}
