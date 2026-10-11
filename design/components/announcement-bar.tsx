"use client";

import { X } from "lucide-react";
import { useState, type ReactNode } from "react";

/** Okrová lišta nad hlavičkou: jedna věta, nejvýš jeden odkaz. Text ink na ochre. */
export function AnnouncementBar({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="relative flex min-h-10.5 items-center justify-center bg-ochre px-11 py-2 text-center text-bar text-ink uppercase [&_a]:underline [&_a]:underline-offset-3">
      <p>{children}</p>
      <button
        type="button"
        aria-label="Zavřít oznámení"
        onClick={() => setOpen(false)}
        className="absolute top-1/2 right-3 inline-flex size-5.5 -translate-y-1/2 items-center justify-center rounded-sm bg-white/40 text-ink"
      >
        <X className="size-3" strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  );
}
