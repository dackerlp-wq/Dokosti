"use server";

import { normalizeCardCode } from "@/lib/cards";
import { sendEmail } from "@/lib/email/send";
import { clubWelcome } from "@/lib/email/templates";
import { getSettings } from "@/lib/settings";
import { getAuthSupabase } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/server";

export type RegisterInput = {
  name: string;
  email: string;
  cardCode: string;
  terms: boolean;
  marketingEmail: boolean;
  /** Tablet v prodejně: po registraci se zařízení odhlásí. */
  kiosk: boolean;
};

export type StartResult = { ok: true; state: "code" } | { ok: true; state: "done"; awarded: number } | { ok: false; error: string };
export type VerifyResult = { ok: true; awarded: number; name: string } | { ok: false; error: string };

const ERRORS: [string, string][] = [
  ["card blocked", "Tato karta je zablokovaná. Ozvěte se nám v prodejně."],
  ["card conflict", "Tato karta už patří jinému zákazníkovi. Ozvěte se nám, spojíme to ručně."],
  ["email conflict", "Tento e-mail máme u jiného zákazníka. Ozvěte se nám, spojíme to ručně."],
  ["account conflict", "K tomuto zákazníkovi už je připojený jiný účet. Ozvěte se nám."],
];
const explain = (msg: string | undefined, fallback: string) => ERRORS.find(([k]) => msg?.includes(k))?.[1] ?? fallback;

function buildPayload(input: RegisterInput, termsVersion: string) {
  return {
    name: input.name.trim(),
    card_code: normalizeCardCode(input.cardCode),
    marketing_email: input.marketingEmail,
    marketing_sms: false,
    source: input.kiosk ? "prodejna" : "web",
    terms_version: termsVersion,
    pets: [],
  };
}

/**
 * Krok 1: uloží rozpracovanou registraci podle e-mailu a pošle šestimístný kód (Supabase OTP; účet vznikne
 * až po ověření kódu). Když je zákazník už přihlášený (Google, nebo účet bez klubu), dokončí registraci rovnou.
 */
export async function clubStart(input: RegisterInput): Promise<StartResult> {
  const name = input.name.trim();
  if (!input.terms) return { ok: false, error: "Bez souhlasu s podmínkami registraci nedokončíme." };
  const card = normalizeCardCode(input.cardCode);
  if (card && (card.length < 4 || card.length > 32)) return { ok: false, error: "Kód karty nevypadá správně." };
  const settings = await getSettings();
  const db = await getAuthSupabase();
  const anon = getSupabase() ?? db;

  const {
    data: { user: current },
  } = await db.auth.getUser();
  // Jméno je povinné, pokud ho nemáme z karty založené u kasy (dokončení nechá stávající jméno).
  const needName = !card;
  if (current?.email) {
    if (!name && needName) return { ok: false, error: "Doplňte jméno." };
    await anon.rpc("club_register_pending", { p_user_id: current.id, p_data: buildPayload(input, settings.club.termsVersion) });
    const done = await complete(current.email, name);
    if (!done.ok) return done;
    return { ok: true, state: "done", awarded: done.awarded };
  }

  const email = input.email.trim().toLowerCase();
  if (!name && needName) return { ok: false, error: "Doplňte jméno." };
  if (!email.includes("@")) return { ok: false, error: "Zadejte platný e-mail." };
  const { error: pendingError } = await anon.rpc("club_register_pending_email", { p_email: email, p_data: buildPayload(input, settings.club.termsVersion) });
  if (pendingError) {
    console.error("club_register_pending_email", pendingError.message);
    return { ok: false, error: "Registraci se nepodařilo uložit. Zkuste to znovu." };
  }
  const { error } = await db.auth.signInWithOtp({ email, options: { shouldCreateUser: true, data: { full_name: name } } });
  if (error) {
    console.error("signInWithOtp", error.message);
    if (error.message.toLowerCase().includes("rate")) return { ok: false, error: "Kód jsme posílali před chvílí. Počkejte minutu a zkuste to znovu." };
    return { ok: false, error: "Kód se nepodařilo poslat. Zkontrolujte e-mail a zkuste to znovu." };
  }
  return { ok: true, state: "code" };
}

/** Krok 2: ověří kód z e-mailu (vznikne session) a dokončí registraci. V kiosku se hned odhlásí. */
export async function clubVerify(email: string, code: string, kiosk: boolean): Promise<VerifyResult> {
  const mail = email.trim().toLowerCase();
  const token = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(token)) return { ok: false, error: "Kód má šest číslic." };
  const db = await getAuthSupabase();
  const { error } = await db.auth.verifyOtp({ email: mail, token, type: "email" });
  if (error) return { ok: false, error: "Kód nesedí nebo už vypršel. Nechte si poslat nový." };
  const result = await complete(mail);
  if (kiosk) await db.auth.signOut();
  return result;
}

/** Přihlášený zákazník s volnou kartou z QR: připojí kartu k účtu. */
export async function claimCard(code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await getAuthSupabase();
  const { error } = await db.rpc("card_claim", { p_code: normalizeCardCode(code) });
  if (error) return { ok: false, error: explain(error.message, error.message.includes("has card") ? "K účtu už je připojená jiná karta. Ozvěte se nám v prodejně." : "Kartu se nepodařilo připojit.") };
  return { ok: true };
}

async function complete(email: string, fallbackName = ""): Promise<VerifyResult> {
  const db = await getAuthSupabase();
  const { data, error } = await db.rpc("club_complete_registration");
  if (error) {
    console.error("club_complete_registration", error.message);
    return { ok: false, error: explain(error.message, "Účet vznikl, ale propojení se nepovedlo. Přihlaste se, zkusíme to znovu.") };
  }
  const r = (data ?? {}) as { done?: boolean; awarded?: number; name?: string };
  const name = r.name || fallbackName;
  if (r.done) {
    try {
      const settings = await getSettings();
      await sendEmail(getSupabase() ?? db, email, clubWelcome(name, r.awarded ?? 0, settings), "klub-vitejte", null);
    } catch (e) {
      console.error("welcome e-mail", e);
    }
  }
  return { ok: true, awarded: r.awarded ?? 0, name };
}
