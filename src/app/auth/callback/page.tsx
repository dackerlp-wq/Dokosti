import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { confirmAuthLink, safeNextPath } from "./actions";

export const metadata: Metadata = { title: "Přihlášení", robots: { index: false } };

const TITLE: Record<string, string> = { signup: "Potvrďte svůj e-mail", magiclink: "Přihlášení", recovery: "Nastavení nového hesla", email_change: "Potvrďte změnu e-mailu", invite: "Přijmout pozvánku" };

/**
 * Cíl odkazů ze Supabase Auth. Odkaz se ověří až tlačítkem (viz actions.ts), takže ho nespotřebuje
 * automatický skener odkazů v poště. Umí `token_hash` z našich šablon i `code` (PKCE) z výchozích.
 */
export default async function AuthCallbackPage({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string; code?: string; next?: string; redirect_to?: string }> }) {
  const q = await searchParams;
  const next = await safeNextPath(q.next, q.redirect_to);
  const type = q.type ?? (q.code ? "magiclink" : "");
  const valid = Boolean((q.token_hash && type) || q.code);
  return (
    <div className="container-dk flex min-h-[60vh] items-center justify-center py-10">
      <div className="w-full max-w-md rounded-[var(--radius-card)] border border-line bg-paper p-6 text-center">
        <p className="label text-brick-text">DoKosti</p>
        <h1 className="mt-1 text-[26px]">{TITLE[type] ?? "Přihlášení"}</h1>
        {valid ? (
          <form action={confirmAuthLink} className="mt-4 space-y-3">
            <input type="hidden" name="token_hash" value={q.token_hash ?? ""} />
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="code" value={q.code ?? ""} />
            <input type="hidden" name="next" value={next} />
            <p className="text-sm text-muted">Ještě jedno klepnutí, ať víme, že odkaz otevíráte vy.</p>
            <Button type="submit" variant="action" className="min-h-12 w-full">
              {type === "recovery" ? "Nastavit heslo" : type === "signup" ? "Potvrdit a přihlásit" : "Přihlásit se"}
            </Button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-muted">Odkaz je neúplný. Nechte si poslat nový na stránce přihlášení.</p>
        )}
      </div>
    </div>
  );
}
