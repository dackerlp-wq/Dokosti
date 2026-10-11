"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * Účet v hlavičce. Stav přihlášení čte z cookie v prohlížeči (bez dotazu na server),
 * aby stránky obchodu mohly zůstat statické a jít z CDN.
 */
export function AccountLink() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let live = true;
    let db: ReturnType<typeof getBrowserSupabase>;
    try {
      db = getBrowserSupabase();
    } catch {
      // Bez nastavené Supabase (např. lokální náhled) zůstává odkaz na přihlášení.
      return;
    }
    db.auth.getSession().then(({ data }) => live && setSignedIn(Boolean(data.session)));
    const { data: sub } = db.auth.onAuthStateChange((_e, session) => live && setSignedIn(Boolean(session)));
    return () => {
      live = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return (
    <Link
      href={signedIn ? "/ucet" : "/ucet/prihlaseni"}
      className="inline-flex min-h-10 items-center gap-2 px-2 text-nav text-green transition-colors duration-300 hover:text-brick-text"
      aria-label={signedIn ? "Můj účet" : "Přihlásit se"}
    >
      <span className="hidden sm:inline">{signedIn ? "Účet" : "Přihlásit"}</span>
      <UserRound strokeWidth={1.75} className="size-6" aria-hidden />
    </Link>
  );
}
