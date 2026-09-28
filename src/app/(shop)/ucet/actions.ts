"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { type PetProfile, petToAnimal } from "@/lib/club";
import { SITE_URL } from "@/lib/seo";
import { getAuthSupabase } from "@/lib/supabase/auth";

export type AuthState = { error?: string; info?: string } | null;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function customerLogin(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const db = await getAuthSupabase();
  const { error } = await db.auth.signInWithPassword({ email: str(fd, "email"), password: String(fd.get("password") ?? "") });
  if (error) return { error: "Nesprávný e-mail nebo heslo." };
  redirect(str(fd, "next") || "/ucet");
}

/**
 * Přihlášení nebo registrace přes Google (Supabase OAuth, PKCE). Po návratu Google → Supabase → /auth/callback
 * se vymění kód za session a jde se na `next`. Nový účet má e-mail od Googlu už ověřený.
 */
export async function signInWithGoogle(fd: FormData): Promise<void> {
  const nextRaw = str(fd, "next") || "/ucet";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/ucet";
  const db = await getAuthSupabase();
  const { data, error } = await db.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect(`/ucet/prihlaseni?chyba=google`);
  redirect(data.url);
}

export async function customerRegister(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = str(fd, "email");
  const password = String(fd.get("password") ?? "");
  if (!email.includes("@")) return { error: "Zadejte platný e-mail." };
  if (password.length < 8) return { error: "Heslo musí mít aspoň 8 znaků." };
  const db = await getAuthSupabase();
  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${SITE_URL}/auth/callback?next=/ucet` },
  });
  if (error) return { error: error.message.includes("already") ? "Tento e-mail už účet má. Zkuste se přihlásit." : "Registrace se nepovedla. Zkuste to znovu." };
  if (!data.session) return { info: "Poslali jsme vám e-mail s potvrzovacím odkazem. Po kliknutí budete přihlášeni." };
  redirect("/ucet");
}

/** Přihlášení odkazem e-mailem (bez hesla). Jen pro existující účty. */
export async function requestMagicLink(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = str(fd, "email");
  if (!email.includes("@")) return { error: "Zadejte platný e-mail." };
  const next = str(fd, "next") || "/ucet";
  const db = await getAuthSupabase();
  const { error } = await db.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next.startsWith("/") ? next : "/ucet")}` } });
  if (error && !error.message.toLowerCase().includes("signups not allowed")) return { error: "Odkaz se nepodařilo poslat. Zkuste to za chvíli." };
  return { info: "Pokud e-mail známe, poslali jsme na něj přihlašovací odkaz. Platí několik minut." };
}

/** Přihlášení šestimístným kódem z e-mailu (stejný e-mail jako u odkazu; kód je v téže zprávě). */
export async function verifyLoginCode(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = str(fd, "email").toLowerCase();
  const token = str(fd, "code").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(token)) return { error: "Kód má šest číslic." };
  const db = await getAuthSupabase();
  const { error } = await db.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { error: "Kód nesedí nebo už vypršel. Nechte si poslat nový." };
  const next = str(fd, "next");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/ucet");
}

export async function customerLogout() {
  const db = await getAuthSupabase();
  await db.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const email = str(fd, "email");
  if (!email.includes("@")) return { error: "Zadejte platný e-mail." };
  const db = await getAuthSupabase();
  await db.auth.resetPasswordForEmail(email, { redirectTo: `${SITE_URL}/auth/callback?next=/ucet/nove-heslo` });
  return { info: "Pokud e-mail známe, poslali jsme na něj odkaz pro nastavení nového hesla." };
}

export async function setNewPassword(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) return { error: "Heslo musí mít aspoň 8 znaků." };
  const db = await getAuthSupabase();
  const { error } = await db.auth.updateUser({ password });
  if (error) return { error: "Heslo se nepodařilo změnit. Otevřete odkaz z e-mailu znovu." };
  redirect("/ucet");
}

/* Profily zvířat pro kalkulačku (tabulka pets, RLS podle uživatele). */

export type PetRow = { id: string; name: string; data: Record<string, unknown>; updated_at: string };

export async function savePet(name: string, data: Record<string, unknown>, id?: string): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const db = await getAuthSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Pro uložení profilu se přihlaste." };
  const { data: cust } = await db.from("customers").select("id").eq("user_id", user.id).maybeSingle();
  const d = data as { species?: string; weightKg?: number; neutered?: boolean; activity?: string; condition?: string; exclude?: string[] };
  const row = {
    user_id: user.id,
    customer_id: cust?.id ?? null,
    name: name.trim().slice(0, 60) || "Bez jména",
    data,
    species: d.species ?? null,
    weight_kg: d.weightKg && d.weightKg > 0 ? d.weightKg : null,
    neutered: d.neutered ?? null,
    activity: d.activity ?? null,
    condition: d.condition ?? null,
    exclude: d.exclude ?? [],
    updated_at: new Date().toISOString(),
  };
  const q = id ? db.from("pets").update(row).eq("id", id).select("id").single() : db.from("pets").insert(row).select("id").single();
  const { data: saved, error } = await q;
  if (error || !saved) return { ok: false, error: "Profil se nepodařilo uložit." };
  revalidatePath("/ucet");
  revalidatePath("/kalkulacka");
  return { ok: true, id: saved.id as string };
}

export async function deletePet(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const db = await getAuthSupabase();
  await db.from("pets").delete().eq("id", id);
  revalidatePath("/ucet");
  revalidatePath("/kalkulacka");
}

/** Profil zvířete z účtu (strukturovaně). Za úplný profil se připíšou Kostičky (`club_reward_pet`). */
export async function savePetProfile(p: PetProfile, id?: string): Promise<{ ok: true; id: string; awarded: number } | { ok: false; error: string }> {
  const db = await getAuthSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Pro uložení profilu se přihlaste." };
  if (!p.name.trim()) return { ok: false, error: "Doplňte jméno zvířete." };
  const { data: cust } = await db.from("customers").select("id").eq("user_id", user.id).maybeSingle();
  const row = {
    user_id: user.id,
    customer_id: cust?.id ?? null,
    name: p.name.trim().slice(0, 60),
    data: petToAnimal(p),
    species: p.species,
    sex: p.sex,
    breed: p.breed.trim().slice(0, 80),
    born_on: /^\d{4}-\d{2}-\d{2}$/.test(p.bornOn) ? p.bornOn : null,
    reproduction: p.sex === "samice" && p.reproduction ? p.reproduction : null,
    pregnancy_week: p.sex === "samice" && p.reproduction === "brezi" && p.pregnancyWeek ? Math.min(9, Math.max(1, Math.round(p.pregnancyWeek))) : null,
    weight_kg: p.weightKg > 0 ? p.weightKg : null,
    neutered: p.neutered,
    activity: p.activity,
    condition: p.condition,
    feeding_now: p.feedingNow,
    current_food: p.currentFood.trim().slice(0, 120),
    exclude: p.exclude,
    note: p.note.trim().slice(0, 300),
    updated_at: new Date().toISOString(),
  };
  const q = id ? db.from("pets").update(row).eq("id", id).select("id").single() : db.from("pets").insert(row).select("id").single();
  const { data: saved, error } = await q;
  if (error || !saved) return { ok: false, error: "Profil se nepodařilo uložit." };
  const { data: awarded } = await db.rpc("club_reward_pet", { p_pet_id: saved.id });
  revalidatePath("/ucet");
  revalidatePath("/kalkulacka");
  return { ok: true, id: saved.id as string, awarded: typeof awarded === "number" ? awarded : 0 };
}

/** Kontakt, adresa a souhlasy v účtu (`club_update_profile`). */
export async function updateProfile(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const db = await getAuthSupabase();
  const { error } = await db.rpc("club_update_profile", {
    p: {
      name: str(fd, "name"),
      phone: str(fd, "phone"),
      street: str(fd, "street"),
      city: str(fd, "city"),
      zip: str(fd, "zip"),
      marketing_email: fd.get("marketing_email") === "on",
      marketing_sms: fd.get("marketing_sms") === "on",
    },
  });
  if (error) return { error: "Uložení se nepovedlo. Zkuste to znovu." };
  revalidatePath("/ucet");
  revalidatePath("/pokladna");
  return { info: "Uloženo." };
}

/** Přihlášený uživatel a jeho uložené profily zvířat pro kalkulačku (načítá se v prohlížeči, stránka může být statická). */
export async function loadProfiles(): Promise<{ user: { email: string } | null; pets: { id: string; name: string; data: Record<string, unknown> }[] }> {
  const db = await getAuthSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { user: null, pets: [] };
  const { data } = await db.from("pets").select("id, name, data").order("updated_at", { ascending: false }).limit(10);
  return { user: { email: (user.email ?? "").toLowerCase() }, pets: (data ?? []) as { id: string; name: string; data: Record<string, unknown> }[] };
}
