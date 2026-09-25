import { NextResponse, type NextRequest } from "next/server";
import { getAuthSupabase } from "@/lib/supabase/auth";

/** Cíl odkazů ze Supabase Auth (potvrzení registrace, obnova hesla): vymění kód za session. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/ucet";
  if (code) {
    const db = await getAuthSupabase();
    await db.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(next.startsWith("/") ? next : "/ucet", url.origin));
}
