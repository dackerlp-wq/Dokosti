"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      <Printer strokeWidth={1.75} className="h-4 w-4" /> Tisk / PDF
    </Button>
  );
}
