"use client";

import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Check,
  Cat,
  Dog,
  Package,
  PawPrint,
  ShoppingBasket,
  Soup,
  Sparkles,
  Timer,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * Dílky průvodce a kalkulačky podle návrhu: hero s ilustrací, panel s postupem a otázkou,
 * velké karty voleb, boční karty. Barvy, písma a rohy jsou z tokenů (rounded-panel 10 px), ikony Lucide.
 */

/** Hero stránky: nadtitulek v pilulce, titulek v ručním písmu se zvýrazněnou částí, úvod a ilustrace. */
export function WizardHero({
  eyebrow,
  title,
  em,
  lead,
  species = "pes",
}: {
  eyebrow: string;
  title: string;
  em: string;
  lead: string;
  species?: "pes" | "kocka";
}) {
  const Pet = species === "kocka" ? Cat : Dog;
  return (
    <section className="mx-auto grid max-w-site items-center gap-7.5 px-5 pt-10 pb-7.5 md:grid-cols-[1fr_330px] md:pt-15">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1.5 text-eyebrow text-green uppercase">
          <span className="size-2 rounded-full bg-brick" aria-hidden />
          {eyebrow}
        </span>
        <h1 className="mt-5 mb-3.5 max-w-[680px] font-display text-display-lg text-green md:text-display-xl">
          {title}
          <br />
          <span className="text-brick-text">{em}</span>
        </h1>
        <p className="max-w-[620px]">{lead}</p>
      </div>
      <div
        className="relative hidden h-55 overflow-hidden rounded-[36px_36px_12px_36px] bg-cream md:grid md:place-items-center"
        aria-hidden
      >
        <span className="absolute top-5 right-7 size-32 rounded-full bg-ochre-badge" />
        <Sparkles
          className="absolute top-12 left-20 size-7 text-green"
          strokeWidth={1.5}
        />
        <Sparkles
          className="absolute bottom-9 left-14 size-5 text-green"
          strokeWidth={1.5}
        />
        <Pet className="relative size-28 text-green" strokeWidth={1.25} />
      </div>
    </section>
  );
}

/** Dva sloupce: panel vlevo, boční karty vpravo (na mobilu pod sebou). */
export function WizardLayout({
  children,
  side,
}: {
  children: ReactNode;
  side?: ReactNode;
}) {
  return (
    <div
      className={`mx-auto grid max-w-site items-start gap-5 px-5 pb-10 md:pb-15 ${side ? "lg:grid-cols-[minmax(0,1fr)_340px]" : ""}`}
    >
      {children}
      {side}
    </div>
  );
}

/** Panel s postupem, otázkou a tlačítky. `onSubmit` obslouží Pokračovat (formulář), `onBack` šipku zpět. */
export function WizardPanel({
  step,
  total,
  stepLabel,
  kicker,
  title,
  helper,
  children,
  onSubmit,
  onBack,
  onReset,
  nextLabel = "Pokračovat",
  nextDisabled = false,
  error,
  hideActions = false,
  hideProgress = false,
  mobileBar,
}: {
  step?: number;
  total?: number;
  stepLabel?: string;
  kicker?: string;
  title: ReactNode;
  helper?: ReactNode;
  children: ReactNode;
  onSubmit?: () => void;
  onBack?: () => void;
  onReset?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  error?: string | null;
  hideActions?: boolean;
  /** Postup ukazuje krokovač nad panelem; v panelu je jen „Krok 4 ze 7 · Pohyb“. */
  hideProgress?: boolean;
  /** Na mobilu přilepená spodní lišta s odhadem (vlevo) a tlačítkem Pokračovat. */
  mobileBar?: ReactNode;
}) {
  const pct = step && total && !hideProgress ? Math.round((step / total) * 100) : null;
  const body = (
    <>
      {kicker ? (
        <p className="mb-2 text-eyebrow text-muted uppercase">
          {hideProgress && step && total ? `Krok ${Math.min(step, total)} ${total === 7 || total === 2 ? "ze" : "z"} ${total} · ` : ""}
          {kicker}
        </p>
      ) : null}
      <h2 className="mb-2 font-display text-display-md text-green">{title}</h2>
      {helper ? <p className="mb-6">{helper}</p> : null}
      {children}
      {error ? (
        <p
          role="alert"
          className="mt-3.5 rounded-control border border-brick-text bg-white p-3 text-small font-semibold text-brick-text"
        >
          {error}
        </p>
      ) : null}
      {!hideActions && mobileBar ? (
        <div className="sticky bottom-0 z-20 -mx-5 -mb-5 mt-7 flex items-center gap-3.5 bg-green px-5 py-3.5 text-cream md:hidden">
          <div className="min-w-0 flex-1">{mobileBar}</div>
          <button type="submit" disabled={nextDisabled} className="inline-flex min-h-13 items-center gap-2 rounded-control bg-cream px-5 text-button text-green disabled:opacity-50">
            {nextLabel.length > 18 ? "Pokračovat" : nextLabel} <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
          </button>
        </div>
      ) : null}
      {!hideActions && (
        <div className={`mt-7 flex-wrap items-center justify-between gap-3.5 border-t border-line pt-5 ${mobileBar ? "hidden md:flex" : "flex"}`}>
          <div className="flex items-center gap-5 text-small font-semibold">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-muted hover:text-green"
              >
                <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />{" "}
                Zpět
              </button>
            ) : null}
            {onReset ? (
              <button
                type="button"
                onClick={onReset}
                className="text-muted hover:text-green"
              >
                Začít znovu
              </button>
            ) : null}
          </div>
          <Button
            type="submit"
            variant={hideProgress ? "dark" : "action"}
            size="md"
            disabled={nextDisabled}
          >
            {nextLabel}{" "}
            <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
          </Button>
        </div>
      )}
    </>
  );
  return (
    <section className="overflow-hidden rounded-panel border border-line bg-white shadow-card">
      {pct !== null && (
        <div className="border-b border-line px-5 pt-5 pb-4 md:px-7">
          <div className="flex items-center justify-between gap-3 text-eyebrow text-muted uppercase">
            <span>
              Krok {step} z {total}
              {stepLabel ? ` · ${stepLabel}` : ""}
            </span>
            <span>{pct} %</span>
          </div>
          <div
            className="mt-3 h-1.75 overflow-hidden rounded-full bg-paper"
            role="progressbar"
            aria-label="Postup průvodcem"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            <div
              className="h-full rounded-full bg-green transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
      {onSubmit ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          className="p-5 md:p-7"
          noValidate
        >
          {body}
        </form>
      ) : (
        <div className="p-5 md:p-7">{body}</div>
      )}
    </section>
  );
}

/** Mřížka karet voleb, dvě vedle sebe (tři na širší obrazovce, když je `cols={3}`). */
export function ChoiceGrid({
  children,
  cols = 2,
  label,
}: {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  label?: string;
}) {
  const grid =
    cols === 4
      ? "grid-cols-2 md:grid-cols-4"
      : cols === 3
        ? "grid-cols-2 md:grid-cols-3"
        : "grid-cols-2";
  return (
    <div role="radiogroup" aria-label={label} className={`grid gap-3 ${grid}`}>
      {children}
    </div>
  );
}

/** Karta volby: ikona v kruhu, název a popis vedle. Chová se jako přepínač (radio); vybraná má zelený kruh a rámeček. */
export function Choice({
  icon: Icon,
  title,
  desc,
  checked,
  onSelect,
  compact = false,
}: {
  icon?: LucideIcon;
  title: string;
  desc?: string;
  checked: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={`flex w-full flex-row items-center text-left transition-colors duration-300 ${compact ? "min-h-14 gap-3 px-4 py-3" : "min-h-22 gap-3.5 p-4"} rounded-card border-2 ${checked ? "border-green bg-paper" : "border-line bg-white hover:border-muted"}`}
    >
      {Icon ? (
        <span className={`flex shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${compact ? "size-10" : "size-14"} ${checked ? "bg-green text-cream" : "bg-cream text-green"}`}>
          <Icon className={compact ? "size-5" : "size-7"} strokeWidth={1.5} aria-hidden />
        </span>
      ) : compact ? (
        <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${checked ? "border-green bg-green text-cream" : "border-line"}`} aria-hidden>
          {checked && <Check className="size-3" strokeWidth={3} />}
        </span>
      ) : null}
      <span className="min-w-0">
        <span className={`block font-extrabold text-green ${compact ? "text-[15px]/[20px]" : "text-[17px]/[22px]"}`}>{title}</span>
        {desc ? <span className="mt-0.5 block text-small">{desc}</span> : null}
      </span>
    </button>
  );
}

/** Krokovač nad průvodcem: čísla v kruzích spojená čarou, hotové s fajfkou, aktuální cihlově. */
export function WizardSteps({ labels, current }: { labels: readonly string[]; current: number }) {
  return (
    <ol aria-label="Kroky průvodce" className="mx-auto mb-7.5 grid max-w-site px-5" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
      {labels.map((label, i) => {
        const done = i < current;
        const on = i === current;
        return (
          <li key={label} className="relative flex flex-col items-center gap-1.5 text-center" aria-current={on ? "step" : undefined}>
            {i > 0 && <span className={`absolute top-4 right-1/2 h-0.5 w-full ${i <= current ? "bg-green" : "bg-line"}`} aria-hidden />}
            <span
              className={`relative z-10 flex size-9 items-center justify-center rounded-full text-[14px] font-extrabold ${done ? "bg-green text-cream" : on ? "bg-brick text-white ring-4 ring-cream" : "border-2 border-line bg-white text-muted"}`}
            >
              {done ? <Check className="size-4" strokeWidth={3} aria-label="hotovo" /> : i + 1}
            </span>
            <span className={`hidden text-[13px]/[18px] sm:block ${on ? "font-extrabold text-green" : "font-semibold text-muted"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Popisek nad polem v průvodci. */
export function WizardLabel({
  children,
  htmlFor,
  required,
}: {
  children: ReactNode;
  htmlFor?: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mt-6 mb-2 block text-label text-green">
      {children}
      {required ? <span className="text-brick-text"> *</span> : null}
    </label>
  );
}

/** Ikony bočních karet podle názvu, aby šly karty použít i ze serverové stránky. */
export type SideIcon =
  | "timer"
  | "soup"
  | "package"
  | "calculator"
  | "basket"
  | "paw";
const SIDE_ICON: Record<SideIcon, LucideIcon> = {
  timer: Timer,
  soup: Soup,
  package: Package,
  calculator: Calculator,
  basket: ShoppingBasket,
  paw: PawPrint,
};

/** Boční karty s ikonou a dvěma větami, pod nimi věta důvěry. */
export function SideCards({
  items,
  trust,
}: {
  items: {
    icon: SideIcon;
    title: string;
    text: string;
    tone?: "paper" | "cream" | "white";
  }[];
  trust?: ReactNode;
}) {
  const tone = {
    paper: "bg-paper border-line",
    cream: "bg-cream border-line",
    white: "bg-white border-line",
  };
  return (
    <aside className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-1">
      {items.map((it) => {
        const Icon = SIDE_ICON[it.icon];
        return (
          <div
            key={it.title}
            className={`rounded-panel border p-5 ${tone[it.tone ?? "paper"]}`}
          >
            <Icon
              className="mb-3 size-7 text-green"
              strokeWidth={1.5}
              aria-hidden
            />
            <h3 className="mb-1.5 text-heading-md text-green">{it.title}</h3>
            <p className="text-small">{it.text}</p>
          </div>
        );
      })}
      {trust ? (
        <p className="text-small sm:col-span-2 lg:col-span-1">{trust}</p>
      ) : null}
    </aside>
  );
}
