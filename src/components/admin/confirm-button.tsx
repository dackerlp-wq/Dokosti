"use client";

import { useId, useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";

type Variant = "primary" | "secondary" | "action" | "ghost";

/**
 * Tlačítko, které se před nevratnou akcí zeptá. Po potvrzení odešle formulář se skrytými poli
 * do server action. Volitelně vyžaduje důvod (uloží se pod `reasonName`).
 */
export function ConfirmButton({
  action,
  fields,
  title,
  text,
  confirmLabel,
  reasonName,
  reasonLabel = "Důvod",
  reasonRequired = false,
  variant = "secondary",
  className = "",
  children,
}: {
  action: (fd: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  title: string;
  text: string;
  confirmLabel: string;
  reasonName?: string;
  reasonLabel?: string;
  reasonRequired?: boolean;
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass(variant, className)}>
        {children}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4" onClick={() => setOpen(false)}>
          <form action={action} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={id} className="w-full max-w-md rounded-[var(--radius-card)] border border-line bg-paper p-5">
            {Object.entries(fields).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <h2 id={id} className="text-[22px]">
              {title}
            </h2>
            <p className="mt-2 text-sm">{text}</p>
            {reasonName && (
              <label className="mt-3 block">
                <span className="label mb-1 block text-[11px] text-muted">{reasonLabel}</span>
                <input name={reasonName} required={reasonRequired} autoFocus />
              </label>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Zpět
              </Button>
              <Button type="submit" variant={variant === "ghost" || variant === "secondary" ? "action" : variant}>
                {confirmLabel}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
