import { redirect } from "next/navigation";
import { cache } from "react";
import { getAuthSupabase } from "@/lib/supabase/auth";

/** Přihlášený zákazník (Supabase Auth), nebo null. */
export const getCustomerUser = cache(async () => {
  const db = await getAuthSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  return user ? { id: user.id, email: (user.email ?? "").toLowerCase() } : null;
});

/**
 * Přihlášený účet bez zákazníka v klubu (např. po přihlášení Googlem): vrátí e-mail a jméno pro dokončení
 * registrace. Nepřihlášený → null. Přihlášený s klubem → přesměruje do účtu.
 */
export async function signedInWithoutClub(): Promise<{ email: string; name: string } | null> {
  const user = await getCustomerUser();
  if (!user) return null;
  const db = await getAuthSupabase();
  const [{ data: linked }, { data: auth }] = await Promise.all([db.from("customers").select("id").eq("user_id", user.id).maybeSingle(), db.auth.getUser()]);
  if (linked) redirect("/ucet");
  const meta = (auth.user?.user_metadata ?? {}) as { full_name?: string; name?: string };
  return { email: user.email, name: meta.full_name ?? meta.name ?? "" };
}
