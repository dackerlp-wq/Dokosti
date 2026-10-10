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
  // Přihlášený uživatel bez záznamu v admins by se jen točil na loginu: řekneme to rovnou.
  const {
    data: { user },
  } = await db.auth.getUser();
  if (user) {
    const { data } = await db.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (!data) {
      await db.auth.signOut();
      return { error: "Účet existuje, ale nemá přístup do administrace. Požádejte správce, aby vás přidal v Nastavení → Uživatelé.", email };
    }
  }
  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout() {
  const db = await getAuthSupabase();
  await db.auth.signOut();
  redirect("/admin/login");
}
