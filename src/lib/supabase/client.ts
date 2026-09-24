"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Klient pro prohlížeč (administrace: nahrávání fotek). */
export function getBrowserSupabase() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
