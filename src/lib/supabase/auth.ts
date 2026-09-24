import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

/**
 * Serverový klient s přihlášeným uživatelem (cookies). Používá administrace.
 * V Server Components nejde cookies zapisovat, o obnovu tokenu se stará proxy.ts.
 */
export async function getAuthSupabase() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* Server Component: zápis cookies není možný, řeší proxy.ts */
        }
      },
    },
  });
}

/** Přihlášený admin, nebo null. Ověřuje se přes tabulku admins (RLS). */
export const getAdmin = cache(async () => {
  const db = await getAuthSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return data ? { id: user.id, email: user.email ?? "" } : null;
});
