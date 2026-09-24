import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "action" | "ghost";

const base =
  "label inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] px-5 transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-green text-cream hover:bg-green-hover",
  secondary: "border-2 border-green text-green hover:bg-paper",
  action: "bg-brick text-cream hover:bg-brick-text",
  /** Vedlejší tlačítko na zeleném podkladu. */
  ghost: "border-2 border-cream text-cream hover:bg-green-hover",
};

export function buttonClass(variant: Variant = "primary", className = "") {
  return `${base} ${variants[variant]} ${className}`;
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant };

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant };

export function ButtonLink({ variant = "primary", className = "", ...props }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}
