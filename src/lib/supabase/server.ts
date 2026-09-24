import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Serverový klient s publishable (anon) klíčem. Čte publikované produkty (RLS)
 * a zakládá objednávky přes RPC `create_order`. Vrací null, dokud není
 * Supabase nastavené v .env, pak web běží na ukázkových datech.
 */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
