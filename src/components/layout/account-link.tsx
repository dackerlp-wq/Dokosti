"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * Tlačítko účtu v hlavičce. Stav přihlášení čte z cookie v prohlížeči (bez dotazu na server),
 * aby stránky obchodu mohly zůstat statické a jít z CDN.
 */
export function AccountLink() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    let live = true;
    const db = getBrowserSupabase();
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
      className="label inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] px-3 text-green hover:bg-cream"
      aria-label={signedIn ? "Můj účet" : "Přihlásit se"}
    >
      <UserRound strokeWidth={1.75} className="h-5 w-5" />
      <span className="hidden sm:inline">{signedIn ? "Účet" : "Přihlásit"}</span>
    </Link>
  );
}
