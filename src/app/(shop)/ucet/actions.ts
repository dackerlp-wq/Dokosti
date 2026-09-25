"use server";

import { redirect } from "next/navigation";
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
