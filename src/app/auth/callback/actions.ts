"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { getAuthSupabase } from "@/lib/supabase/auth";

const OTP_TYPES = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/** Bezpečná cílová cesta: jen relativní, ne „//“. */
export async function safeNextPath(next: string | null | undefined, redirectTo?: string | null): Promise<string> {
  let n = next ?? null;
  if (!n && redirectTo) {
    try {
      n = new URL(redirectTo).searchParams.get("next");
    } catch {
      n = null;
    }
  }
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/ucet";
}

/**
 * Ověření odkazu z e-mailu až po klepnutí na tlačítko (POST). Skenery odkazů v poště otevírají adresy
 * z e-mailů automaticky; kdyby se odkaz ověřoval hned při otevření, spotřebovaly by ho dřív než zákazník.
 */
export async function confirmAuthLink(fd: FormData): Promise<void> {
  const tokenHash = String(fd.get("token_hash") ?? "");
  const type = String(fd.get("type") ?? "");
  const code = String(fd.get("code") ?? "");
  const next = await safeNextPath(String(fd.get("next") ?? ""));
  const db = await getAuthSupabase();
  let failed = false;
  if (tokenHash && OTP_TYPES.includes(type)) {
    const { error } = await db.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
    failed = Boolean(error);
  } else if (code) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  } else {
    failed = true;
  }
  if (failed) redirect(`/ucet/prihlaseni?chyba=odkaz${next !== "/ucet" ? `&next=${encodeURIComponent(next)}` : ""}`);
  redirect(next);
}
