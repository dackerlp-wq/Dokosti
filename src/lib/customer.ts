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
