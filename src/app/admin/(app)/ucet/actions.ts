"use server";

import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

export type PasswordState = { ok?: true; error?: string } | null;

/** Změna hesla přihlášeného správce. Ověří se staré heslo, nové musí mít aspoň 10 znaků. */
export async function changePassword(_prev: PasswordState, fd: FormData): Promise<PasswordState> {
  const admin = await getAdmin();
  if (!admin) return { error: "Nejste přihlášeni." };
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const again = String(fd.get("again") ?? "");
  if (next.length < 10) return { error: "Nové heslo musí mít aspoň 10 znaků." };
  if (next !== again) return { error: "Nová hesla se neshodují." };

  const db = await getAuthSupabase();
  const { error: verify } = await db.auth.signInWithPassword({ email: admin.email, password: current });
  if (verify) return { error: "Současné heslo nesouhlasí." };
  const { error } = await db.auth.updateUser({ password: next });
  if (error) return { error: error.message };
  return { ok: true };
}
