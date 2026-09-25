"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

/**
 * Cookies lišta a analytika. Google Analytics se načte jen po souhlasu a jen když je nastavené
 * NEXT_PUBLIC_GA_ID. Bez GA ID se lišta nezobrazuje: web sám žádné sledovací cookies nepoužívá.
 */
const KEY = "dokosti-consent";
const listeners = new Set<() => void>();
type Consent = "granted" | "denied" | null;

function read(): Consent {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "granted" || v === "denied" ? v : null;
  } catch {
    return null;
  }
}
function write(v: Consent) {
  try {
    if (v) window.localStorage.setItem(KEY, v);
  } catch {
    /* bez localStorage se lišta zobrazí znovu */
  }
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function CookieConsent() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const consent = useSyncExternalStore(subscribe, read, () => null);
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  if (!gaId || !mounted) return null;

  return (
    <>
      {consent === "granted" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          <Script id="ga" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${gaId}',{anonymize_ip:true});`}
          </Script>
        </>
      )}
      {consent === null && (
        <div role="dialog" aria-label="Souhlas s cookies" className="fixed inset-x-3 bottom-3 z-30 mx-auto max-w-lg rounded-[var(--radius-card)] border border-line bg-paper p-4 text-sm">
          <p>
            Rádi bychom měřili návštěvnost, abychom věděli, co vás zajímá. K tomu potřebujeme váš souhlas s analytickými
            cookies. Nákup funguje i bez nich.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={() => write("granted")}>
              Souhlasím
            </Button>
            <Button type="button" variant="secondary" onClick={() => write("denied")}>
              Jen nutné
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
