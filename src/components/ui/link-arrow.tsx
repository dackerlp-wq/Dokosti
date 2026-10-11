import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/** Odkaz s bílým diskem a šipkou: „Vše z řady“, „Podrobnosti o doručení“. */
export function LinkArrow({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`group inline-flex items-center gap-2.5 text-button font-semibold text-brick-text hover:underline ${className}`}>
      {children}
      <span className="inline-flex size-7.5 items-center justify-center rounded-full bg-white shadow-float transition-colors duration-300 group-hover:bg-brick-text group-hover:text-white">
        <ChevronRight className="size-3.5" strokeWidth={2.25} aria-hidden />
      </span>
    </Link>
  );
}
