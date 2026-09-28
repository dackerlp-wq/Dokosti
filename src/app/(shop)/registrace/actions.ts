"use server";

import { getSettings } from "@/lib/settings";
import { type PetProfile, petToAnimal } from "@/lib/club";
import { sendEmail } from "@/lib/email/send";
import { clubWelcome } from "@/lib/email/templates";
import { SITE_URL } from "@/lib/seo";
import { getAuthSupabase } from "@/lib/supabase/auth";
import { getSupabase } from "@/lib/supabase/server";

export type RegisterInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  cardCode: string;
  pets: PetProfile[];
  terms: boolean;
  marketingEmail: boolean;
  marketingSms: boolean;
  heardFrom: string;
  /** Tablet v prodejně: po registraci se zařízení odhlásí. */
  kiosk: boolean;
};

export type RegisterResult =
  | { ok: true; state: "signedIn"; awarded: number }
  | { ok: true; state: "confirmEmail" }
  | { ok: false; error: string };

const ERRORS: [string, string][] = [
  ["card conflict", "Tato karta už patří jinému zákazníkovi. Ozvěte se nám, spojíme to ručně."],
  ["email conflict", "Tento e-mail máme u jiného zákazníka. Ozvěte se nám, spojíme to ručně."],
  ["account conflict", "K tomuto zákazníkovi už je připojený jiný účet. Ozvěte se nám."],
];

/**
 * Registrace do klubu: založí účet (Supabase Auth), uloží rozpracovanou registraci a když má hned
 * session, dokončí ji (`club_complete_registration`). Bez session se dokončí po potvrzení e-mailu.
 */
export async function clubRegister(input: RegisterInput): Promise<RegisterResult> {
  const db = await getAuthSupabase();
  // Už přihlášený účet (Google, nebo e-mail bez dokončené registrace): bez hesla, e-mail z účtu.
  const {
    data: { user: current },
  } = await db.auth.getUser();
  const email = (current?.email ?? input.email).trim().toLowerCase();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Doplňte jméno." };
  if (!email.includes("@")) return { ok: false, error: "Zadejte platný e-mail." };
  if (!current && input.password.length < 8) return { ok: false, error: "Heslo musí mít aspoň 8 znaků." };
  if (!input.terms) return { ok: false, error: "Bez souhlasu s podmínkami registraci nedokončíme." };
  const card = input.cardCode.trim().toUpperCase();
  if (card && (card.length < 4 || /[^\x20-\x7e]/.test(card))) return { ok: false, error: "Kód karty nevypadá správně." };
  const settings = await getSettings();
  const pets = input.pets
    .filter((p) => p.name.trim())
    .slice(0, 10)
    .map((p) => ({
      name: p.name.trim(),
      species: p.species,
      breed: p.breed.trim(),
      born_on: /^\d{4}-\d{2}-\d{2}$/.test(p.bornOn) ? p.bornOn : "",
      weight_kg: p.weightKg > 0 ? p.weightKg : "",
      neutered: p.neutered,
      activity: p.activity,
      condition: p.condition,
      feeding_now: p.feedingNow,
      current_food: p.currentFood.trim(),
      exclude: p.exclude,
      note: p.note.trim(),
      data: petToAnimal(p),
    }));
  const payload = {
    name,
    phone: input.phone.trim(),
    card_code: card,
    marketing_email: input.marketingEmail,
    marketing_sms: input.marketingSms,
    heard_from: input.heardFrom.trim().slice(0, 60),
    source: input.kiosk ? "prodejna" : "web",
    terms_version: settings.club.termsVersion,
    pets,
  };

  const anon = getSupabase();
  let userId: string;
  if (current) {
    userId = current.id;
    await (anon ?? db).rpc("club_register_pending", { p_user_id: userId, p_data: payload });
  } else {
    const { data, error } = await db.auth.signUp({ email, password: input.password, options: { emailRedirectTo: `${SITE_URL}/auth/callback?next=/ucet?vitejte=1` } });
    if (error || !data.user) {
      console.error("signUp", error?.message);
      return { ok: false, error: error?.message.includes("already") ? "Tento e-mail už účet má. Přihlaste se a údaje doplňte v účtu." : "Registrace se nepovedla. Zkuste to znovu." };
    }
    // Supabase u existujícího e-mailu vrátí „uživatele“ bez identit, aby neprozradil, že účet existuje.
    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { ok: false, error: "Tento e-mail už účet má. Přihlaste se a údaje doplňte v účtu." };
    }
    userId = data.user.id;
    await (anon ?? db).rpc("club_register_pending", { p_user_id: userId, p_data: payload });
    if (!data.session) return { ok: true, state: "confirmEmail" };
  }

  const { data: done, error: doneError } = await db.rpc("club_complete_registration");
  if (doneError) {
    console.error("club_complete_registration", doneError);
    if (input.kiosk) await db.auth.signOut();
    return { ok: false, error: ERRORS.find(([k]) => doneError.message.includes(k))?.[1] ?? "Účet vznikl, ale propojení se nepovedlo. Přihlaste se, zkusíme to znovu." };
  }
  const r = (done ?? {}) as { awarded?: number };
  try {
    await sendEmail(anon ?? db, email, clubWelcome(name, r.awarded ?? 0, settings), "klub-vitejte", null);
  } catch (e) {
    console.error("welcome e-mail", e);
  }
  if (input.kiosk) await db.auth.signOut();
  return { ok: true, state: "signedIn", awarded: r.awarded ?? 0 };
}
