"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FLASH_BY_CODE, FLASH_COOKIE, type FlashMessage } from "@/lib/flash-shared";

function readCookie(): FlashMessage | null {
  const m = document.cookie.split("; ").find((c) => c.startsWith(FLASH_COOKIE + "="));
  if (!m) return null;
  try {
    return JSON.parse(decodeURIComponent(m.slice(FLASH_COOKIE.length + 1))) as FlashMessage;
  } catch {
    return null;
  }
}

/** Lišta s hláškou po akci. Čte cookie z server action nebo ?zprava=kód, po pár sekundách zmizí. */
export function Flash() {
  const params = useSearchParams();
  const [msg, setMsg] = useState<FlashMessage | null>(null);
  const code = params.get("zprava");

  useEffect(() => {
    // Cookie se čte až v prohlížeči; zpoždění přes timeout, aby se stav neměnil přímo v efektu.
    const show = setTimeout(() => {
      const fromCookie = readCookie();
      if (fromCookie) document.cookie = `${FLASH_COOKIE}=; path=/admin; max-age=0`;
      const m = fromCookie ?? (code ? FLASH_BY_CODE[code] : null) ?? null;
      if (m) setMsg(m);
    }, 0);
    return () => clearTimeout(show);
  }, [code]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), msg.kind === "error" ? 7000 : 3500);
    return () => clearTimeout(t);
  }, [msg]);

  if (!msg) return null;
  return (
    <div role={msg.kind === "error" ? "alert" : "status"} className={`fixed top-5 right-5 z-50 max-w-md rounded-control px-5 py-3 text-button shadow-menu ${msg.kind === "error" ? "bg-brick text-white" : "bg-green text-cream"}`}>
      {msg.text}
      <button type="button" onClick={() => setMsg(null)} aria-label="Zavřít" className="ml-3 opacity-70 hover:opacity-100">
        ×
      </button>
    </div>
  );
}
