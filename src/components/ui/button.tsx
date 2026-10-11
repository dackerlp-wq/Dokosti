import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * Tlačítko podle design/components/button.tsx.
 * Názvy variant zůstávají kvůli administraci: `primary` je tmavé zelené, `action` cihlové (jedna akce k nákupu v pohledu),
 * `secondary` obrysové, `ghost` obrysové na zelené ploše. Aliasy `dark` a `outline` odpovídají názvům v design systému.
 */
type Variant = "primary" | "secondary" | "action" | "ghost" | "dark" | "outline";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2.5 rounded-control font-body text-button whitespace-nowrap transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-green text-cream hover:bg-green-hover",
  dark: "bg-green text-cream hover:bg-green-hover",
  /** Hlavní akce: jen bílý text na brick (cream na brick má nízký kontrast), spodní hrana v brick-text. */
  action: "bg-brick text-white inset-shadow-edge hover:bg-brick-text",
  secondary: "bg-white text-green ring-1 ring-inset ring-green hover:bg-green hover:text-cream",
  outline: "bg-white text-green ring-1 ring-inset ring-green hover:bg-green hover:text-cream",
  /** Obrysové na zelené ploše. */
  ghost: "bg-transparent text-cream ring-1 ring-inset ring-cream hover:bg-green-hover",
};

/** `sm` karta a hlavička (výchozí, odpovídá dosavadní výšce 40 px), `md` běžné, `lg` detail produktu. */
const sizes: Record<Size, string> = {
  sm: "min-h-10 px-3.5 py-2",
  md: "min-h-13 px-6.5 py-3",
  lg: "min-h-15 px-6.5 py-4",
};

export function buttonClass(variant: Variant = "primary", className = "", size: Size = "sm") {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size };

export function Button({ variant = "primary", size = "sm", className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, className, size)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function ButtonLink({ variant = "primary", size = "sm", className = "", ...props }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, className, size)} {...props} />;
}
