"use client";

import { Printer } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Otevře tisk po načtení účtenky (bez `button`), nebo vykreslí tlačítko Tisk. */
export function AutoPrint({ button = false }: { button?: boolean }) {
  useEffect(() => {
    if (button) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [button]);
  if (!button) return null;
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()} className="min-h-9">
      <Printer strokeWidth={1.75} className="h-4 w-4" /> Tisk
    </Button>
  );
}
