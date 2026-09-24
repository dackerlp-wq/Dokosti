"use server";

import { redirect } from "next/navigation";
import { getAuthSupabase } from "@/lib/supabase/auth";

export type LoginState = { error: string; email: string } | null;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const db = await getAuthSupabase();
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) return { error: "Nesprávný e-mail nebo heslo.", email };
  redirect("/admin");
}

export async function logout() {
  const db = await getAuthSupabase();
  await db.auth.signOut();
  redirect("/admin/login");
}
