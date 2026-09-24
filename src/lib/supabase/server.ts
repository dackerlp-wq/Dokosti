import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Serverový klient se service role klíčem. Jen pro server actions a route handlery,
 * nikdy neposílat do prohlížeče. Vrací null, dokud není Supabase nastavené v .env.
 */
export function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
