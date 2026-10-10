import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ADMIN_ROLE_RANK, type AdminRole } from "@/lib/admin";

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

export type Admin = { id: string; email: string; name: string; role: AdminRole; isManager: boolean };

/** Přihlášený admin, nebo null. Ověřuje se přes tabulku admins (RLS). */
export const getAdmin = cache(async (): Promise<Admin | null> => {
  const db = await getAuthSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const { data } = await db.from("admins").select("user_id, role, name").eq("user_id", user.id).maybeSingle();
  if (!data) return null;
  const role: AdminRole = data.role === "obsluha" ? "obsluha" : data.role === "brigada" ? "brigada" : "spravce";
  const email = user.email ?? "";
  const name = (data.name as string | null)?.trim() || email.split("@")[0];
  return { id: user.id, email, name, role, isManager: role === "spravce" };
});

/**
 * Stránka nebo akce jen pro přihlášené s danou minimální rolí: brigada < obsluha < spravce.
 * Bez přihlášení přesměruje na login (s návratem), s nižší rolí na Dnes s hláškou.
 */
export async function requireAdmin(min: AdminRole = "obsluha", next?: string): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect(next ? `/admin/login?next=${encodeURIComponent(next)}` : "/admin/login");
  if (ADMIN_ROLE_RANK[admin.role] < ADMIN_ROLE_RANK[min]) redirect("/admin?zprava=opravneni");
  return admin;
}

/** Jen správce (nastavení, finance, mzdy, dokumenty, statistiky). */
export async function requireManager(): Promise<Admin> {
  return requireAdmin("spravce");
}
