import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "dark" | "outline";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2.5 rounded-control font-body text-button whitespace-nowrap transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  // Hlavní akce: jen bílý text na brick (cream na brick má nízký kontrast)
  primary: "bg-brick text-white inset-shadow-edge hover:bg-brick-text",
  dark: "bg-green text-cream hover:bg-green-hover",
  outline: "bg-white text-green ring-1 ring-inset ring-green hover:bg-green hover:text-cream",
};

const sizes: Record<Size, string> = {
  sm: "min-h-10 px-3.5 py-2",
  md: "min-h-13 px-6.5 py-3",
  lg: "min-h-15 px-6.5 py-4",
};

type Common = { variant?: Variant; size?: Size; block?: boolean; children: ReactNode; className?: string };
type AsButton = Common & Omit<ComponentProps<"button">, keyof Common> & { href?: undefined };
type AsLink = Common & { href: string };

export function Button(props: AsButton | AsLink) {
  const { variant = "primary", size = "md", block, className = "", children, ...rest } = props;
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${block ? "flex w-full" : ""} ${className}`;
  if (typeof props.href === "string") {
    return (
      <Link href={props.href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" {...(rest as ComponentProps<"button">)} className={cls}>
      {children}
    </button>
  );
}
