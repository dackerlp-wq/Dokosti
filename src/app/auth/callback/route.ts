import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getAuthSupabase } from "@/lib/supabase/auth";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Kam po přihlášení: `next` přímo v adrese, nebo `next` uvnitř `redirect_to` (šablony posílají
 * původní cíl z aplikace celý, např. https://dokosti.cz/auth/callback?next=/ucet/nove-heslo).
 * Jen relativní cesty, aby odkaz nešel zneužít k přesměrování jinam.
 */
function safeNext(url: URL): string {
  let next = url.searchParams.get("next");
  const redirectTo = url.searchParams.get("redirect_to");
  if (!next && redirectTo) {
    try {
      next = new URL(redirectTo).searchParams.get("next");
    } catch {
      next = null;
    }
  }
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/ucet";
}

/**
 * Cíl odkazů ze Supabase Auth (potvrzení registrace, přihlášení odkazem, obnova hesla).
 * Podporuje dva tvary odkazu:
 *  - `?token_hash=…&type=…` z našich šablon (supabase/auth-emaily): funguje i v jiném prohlížeči nebo na telefonu,
 *  - `?code=…` z výchozích šablon Supabase (PKCE): funguje jen v prohlížeči, kde se o odkaz požádalo.
 * Při chybě (prošlý nebo použitý odkaz) pošle na přihlášení s vysvětlením.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = safeNext(url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const code = url.searchParams.get("code");

  const db = await getAuthSupabase();
  let failed = false;
  if (tokenHash && type && (OTP_TYPES as string[]).includes(type)) {
    const { error } = await db.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
    failed = Boolean(error);
  } else if (code) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  } else {
    failed = true;
  }

  if (failed) {
    const login = new URL("/ucet/prihlaseni", url.origin);
    login.searchParams.set("chyba", "odkaz");
    if (next !== "/ucet") login.searchParams.set("next", next);
    return NextResponse.redirect(login);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
