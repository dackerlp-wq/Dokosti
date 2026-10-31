"use client";

import { X } from "lucide-react";
import { useState, type ReactNode } from "react";

/** Zelená lišta nad hlavičkou: jedna věta, nejvýš jeden odkaz. Text cream na green. */
export function AnnouncementBar({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="relative flex min-h-9 items-center justify-center bg-green px-11 py-2 text-center text-bar text-cream [&_a]:font-bold [&_a]:text-white [&_a]:underline [&_a]:underline-offset-3">
      <p>{children}</p>
      <button
        type="button"
        aria-label="Zavřít oznámení"
        onClick={() => setOpen(false)}
        className="absolute top-1/2 right-3 inline-flex size-5.5 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-cream"
      >
        <X className="size-3" strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
}
