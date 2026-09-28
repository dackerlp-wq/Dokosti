"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { claimCard } from "@/app/(shop)/registrace/actions";
import { Button } from "@/components/ui/button";

/** Přihlášený zákazník s kartou z QR: jedno tlačítko, karta se připojí k účtu. */
export function ClaimCardButton({ code }: { code: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="max-w-md space-y-3">
      <Button
        type="button"
        variant="action"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await claimCard(code);
            if (!res.ok) return setError(res.error);
            router.push("/ucet?karta=1");
          })
        }
      >
        {pending ? "Připojuji…" : "Připojit kartu k mému účtu"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-brick-text">
          {error}
        </p>
      )}
    </div>
  );
}
